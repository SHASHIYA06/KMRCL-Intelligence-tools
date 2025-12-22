
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ZoomIn, ZoomOut, Download, RefreshCw, Move, Info, Zap, ChevronDown, FileJson, ImageIcon, FileType, Search, XCircle, Code } from 'lucide-react';
import { CircuitComponent } from '../types';

interface CircuitViewerProps {
  svgContent: string;
  components?: CircuitComponent[];
  resolution?: 'STANDARD' | 'HD' | '4K';
}

interface Point {
    x: number;
    y: number;
}

export const CircuitViewer: React.FC<CircuitViewerProps> = ({ svgContent, components, resolution = 'STANDARD' }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: CircuitComponent } | null>(null);
  
  // Tracing State
  const [highlightedElements, setHighlightedElements] = useState<SVGElement[]>([]);
  const [connectionPoints, setConnectionPoints] = useState<Point[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // --- FILTERED COMPONENTS ---
  const filteredComponents = useMemo(() => {
    if (!components) return [];
    if (!searchQuery) return components;
    const lowerQ = searchQuery.toLowerCase();
    
    return components.filter(c => 
        (c.designator?.toLowerCase() || '').includes(lowerQ) || 
        (c.type?.toLowerCase() || '').includes(lowerQ) || 
        (c.value?.toLowerCase() || '').includes(lowerQ) ||
        (c.description?.toLowerCase() || '').includes(lowerQ)
    );
  }, [components, searchQuery]);

  // --- SEARCH HIGHLIGHTING ---
  useEffect(() => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // 1. Reset previous search highlights
    const prevMatches = svgElement.querySelectorAll('[data-search-match="true"]');
    prevMatches.forEach(el => {
        const svgEl = el as SVGElement;
        svgEl.removeAttribute('data-search-match');
        
        // Restore styling
        const origStroke = svgEl.dataset.origStroke;
        const origWidth = svgEl.dataset.origWidth;

        if (origStroke && origStroke !== 'none') svgEl.setAttribute('stroke', origStroke);
        else svgEl.removeAttribute('stroke');

        if (origWidth) svgEl.setAttribute('stroke-width', origWidth);
        else svgEl.removeAttribute('stroke-width');

        svgEl.style.filter = '';
        svgEl.style.opacity = '1';
    });

    // 2. Dim everything if search is active
    const allComponentIds = components?.map(c => c.designator) || [];
    allComponentIds.forEach(id => {
        if (!id) return;
        const el = svgElement.querySelector(`#${id}`) as SVGElement;
        if (el) {
             if (searchQuery && !filteredComponents.find(c => c.designator === id)) {
                 el.style.opacity = '0.3'; // Dim non-matches
             } else {
                 el.style.opacity = '1';
             }
        }
    });

    if (!searchQuery) return;

    // 3. Highlight new matches
    filteredComponents.forEach(comp => {
        if (!comp.designator) return;
        const el = svgElement.querySelector(`#${comp.designator}`) as SVGElement;
        if (el) {
            // Save original styles if not already saved
            if (!el.dataset.origStroke) el.dataset.origStroke = el.getAttribute('stroke') || 'none';
            if (!el.dataset.origWidth) el.dataset.origWidth = el.getAttribute('stroke-width') || '1';

            // Apply Search Highlight (Gold/Amber)
            el.setAttribute('stroke', '#fbbf24'); // amber-400
            el.setAttribute('stroke-width', '4');
            el.style.filter = 'drop-shadow(0 0 8px #fbbf24)';
            el.setAttribute('data-search-match', 'true');
            el.style.opacity = '1';
        }
    });

  }, [filteredComponents, searchQuery, components]);

  // --- TRACING LOGIC HELPERS ---
  const getElementCoordinates = (el: SVGElement): Point[] => {
      const points: Point[] = [];
      const tagName = el.tagName.toLowerCase();
      
      if (tagName === 'line') {
          points.push({ x: parseFloat(el.getAttribute('x1') || '0'), y: parseFloat(el.getAttribute('y1') || '0') });
          points.push({ x: parseFloat(el.getAttribute('x2') || '0'), y: parseFloat(el.getAttribute('y2') || '0') });
      } else if (tagName === 'path') {
          const d = el.getAttribute('d') || '';
          // Improved path parsing to capture Move(M) and Line(L) endpoints roughly
          const matches = d.match(/[ML]?\s*-?\d+(\.\d+)?\s*,?\s*-?\d+(\.\d+)?/g);
          if (matches) {
              matches.forEach(match => {
                  const nums = match.match(/-?\d+(\.\d+)?/g);
                  if (nums && nums.length >= 2) {
                      points.push({ x: parseFloat(nums[0]), y: parseFloat(nums[1]) });
                  }
              });
          }
      } else if (tagName === 'circle') {
          // For circles, we add center and "cardinal" points to simulate terminals
          const cx = parseFloat(el.getAttribute('cx') || '0');
          const cy = parseFloat(el.getAttribute('cy') || '0');
          const r = parseFloat(el.getAttribute('r') || '0');
          points.push({ x: cx, y: cy });
          points.push({ x: cx + r, y: cy });
          points.push({ x: cx - r, y: cy });
          points.push({ x: cx, y: cy + r });
          points.push({ x: cx, y: cy - r });
      } else if (tagName === 'rect') {
          const x = parseFloat(el.getAttribute('x') || '0');
          const y = parseFloat(el.getAttribute('y') || '0');
          const w = parseFloat(el.getAttribute('width') || '0');
          const h = parseFloat(el.getAttribute('height') || '0');
          
          // Add corners and midpoints (common terminal locations)
          points.push({ x: x, y: y }); 
          points.push({ x: x + w, y: y }); 
          points.push({ x: x, y: y + h }); 
          points.push({ x: x + w, y: y + h }); 
          points.push({ x: x + w/2, y: y }); 
          points.push({ x: x + w/2, y: y + h }); 
          points.push({ x: x, y: y + h/2 }); 
          points.push({ x: x + w, y: y + h/2 }); 

      } else if (tagName === 'polyline' || tagName === 'polygon') {
          const pointsStr = el.getAttribute('points') || '';
          const coords = pointsStr.trim().split(/[\s,]+/);
          for (let i = 0; i < coords.length; i += 2) {
             if(coords[i+1]) points.push({ x: parseFloat(coords[i]), y: parseFloat(coords[i+1]) });
          }
      }
      return points;
  };

  const arePointsClose = (p1: Point, p2: Point, threshold = 6) => {
      // Threshold increased slightly to account for line caps and drawing inaccuracies
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)) < threshold;
  };

  const checkConnectivity = (el1: SVGElement, el2: SVGElement): Point | null => {
      const pts1 = getElementCoordinates(el1);
      const pts2 = getElementCoordinates(el2);
      
      for (const p1 of pts1) {
          for (const p2 of pts2) {
              if (arePointsClose(p1, p2)) return p1; // Return the connection point
          }
      }
      return null;
  };

  const traceNet = (startElement: SVGElement) => {
      if (!containerRef.current) return;
      const svg = containerRef.current.querySelector('svg');
      if (!svg) return;

      const allElements = Array.from(svg.querySelectorAll('.wire, line, path, circle, rect, polyline, polygon')) as SVGElement[];
      
      const net = new Set<SVGElement>();
      const points: Point[] = [];
      const queue: SVGElement[] = [startElement];
      net.add(startElement);

      while (queue.length > 0) {
          const current = queue.shift()!;
          
          for (const el of allElements) {
              if (el.id === 'circuit-bg' || el.tagName === 'g' || el.closest('g')?.id === 'background') continue;
              if (net.has(el)) continue;

              const intersection = checkConnectivity(current, el);
              if (intersection) {
                  net.add(el);
                  queue.push(el);
                  points.push(intersection);
              }
          }
      }
      return { elements: Array.from(net), terminals: points };
  };

  const clearHighlights = () => {
    highlightedElements.forEach(el => {
        el.setAttribute('stroke', el.dataset.origStroke || 'black');
        el.setAttribute('stroke-width', el.dataset.origWidth || '1');
        el.style.filter = '';
        el.removeAttribute('data-highlighted');
        if (el.dataset.origFill) el.setAttribute('fill', el.dataset.origFill);
    });
    setHighlightedElements([]);
    setConnectionPoints([]);
  };

  const handleSvgClick = (e: React.MouseEvent) => {
      if (isDragging) return;
      if ((e.target as Element).closest('button')) return;

      const target = e.target as SVGElement;
      const tagName = target.tagName.toLowerCase();
      
      if (tagName === 'svg' || target.id === 'circuit-bg') {
          clearHighlights();
          return;
      }

      const isMultiSelect = e.shiftKey || e.ctrlKey;

      // Allow clicking on any valid shape to start tracing (Terminals, Wires, Components)
      if (['line', 'path', 'circle', 'rect', 'polyline', 'polygon'].includes(tagName)) {
          
          if (!isMultiSelect) {
             clearHighlights(); 
          }
          
          const result = traceNet(target);
          if (result && result.elements.length > 0) {
              const newHighlights = isMultiSelect ? [...highlightedElements] : [];

              result.elements.forEach(el => {
                  if (newHighlights.includes(el)) return;
                  
                  if (!el.dataset.origStroke) el.dataset.origStroke = el.getAttribute('stroke') || 'black';
                  if (!el.dataset.origWidth) el.dataset.origWidth = el.getAttribute('stroke-width') || '1';
                  if (!el.dataset.origFill) el.dataset.origFill = el.getAttribute('fill') || 'none';
                  
                  // Highlight NET
                  el.setAttribute('stroke', '#00ff9d'); // Neon Green
                  el.setAttribute('stroke-width', '3');
                  el.style.filter = 'drop-shadow(0 0 5px #00ff9d)';
                  el.setAttribute('data-highlighted', 'true');
                  
                  // If it's a solid component like a circle or rect, maybe give it a fill hint or outline
                  if (el.tagName === 'rect' || el.tagName === 'circle') {
                      // Don't fill, just stroke to show selection
                      // el.setAttribute('fill', '#00ff9d33'); 
                  }
                  newHighlights.push(el);
              });
              setHighlightedElements(newHighlights);
              
              // Update connection points for visualization
              setConnectionPoints(prev => isMultiSelect ? [...prev, ...result.terminals] : result.terminals);
          }
      }
  };

  // --- HOVER INTERACTIONS ---
  useEffect(() => {
    if (!containerRef.current || !components) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const handleMouseEnter = (e: MouseEvent, component: CircuitComponent, targetEl: Element) => {
        const el = targetEl as SVGElement;
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        
        setTooltip({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top,
            content: component
        });
        
        el.style.cursor = 'crosshair'; // Change cursor to crosshair to indicate terminal selection
        if (!el.dataset.origOpacity) el.dataset.origOpacity = el.style.opacity || '1';
        el.style.opacity = '0.7';
    };

    const handleMouseLeave = (targetEl: Element) => {
        setTooltip(null);
        const el = targetEl as SVGElement;
        if (el.dataset.origOpacity) el.style.opacity = el.dataset.origOpacity;
    };

    // Attach listeners
    const cleanupFns: (() => void)[] = [];
    components.forEach(comp => {
        if (!comp.designator) return;
        const el = svgElement.querySelector(`#${comp.designator}`);
        if (el) {
            const enter = (e: Event) => handleMouseEnter(e as MouseEvent, comp, el);
            const leave = () => handleMouseLeave(el);
            
            el.addEventListener('mouseenter', enter);
            el.addEventListener('mouseleave', leave);
            
            cleanupFns.push(() => {
                el.removeEventListener('mouseenter', enter);
                el.removeEventListener('mouseleave', leave);
            });
        }
    });

    return () => {
        cleanupFns.forEach(fn => fn());
    };
  }, [components, scale, position, filteredComponents]);

  // --- PAN & ZOOM ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.min(Math.max(0.5, s * delta), 5));
    }
  };

  // --- EXPORT SVG ---
  const handleExportSVG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `circuit_diagram_${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  // --- EXPORT PNG ---
  const handleExportPNG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // Use a cloned SVG to manipulate for export (e.g., scale up) without affecting UI
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Set explicit namespace if missing to ensure validity
    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new window.Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        // Set resolution based on prop or default to high res
        const resMultiplier = resolution === '4K' ? 4 : resolution === 'HD' ? 2 : 1;
        // Default base size 1024 if viewbox not present
        const baseWidth = clone.viewBox.baseVal?.width || 1024;
        const baseHeight = clone.viewBox.baseVal?.height || 1024;
        
        canvas.width = baseWidth * resMultiplier;
        canvas.height = baseHeight * resMultiplier;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Fill white background (crucial for PNG visibility on dark modes)
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `circuit_diagram_${Date.now()}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col h-full bg-[#e0e0e0] rounded-xl overflow-hidden shadow-inner border border-white/20 relative">
      
      {/* TOOLBAR */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur shadow-lg rounded-lg p-1 flex space-x-1 border border-gray-200">
            <button onClick={() => setScale(s => Math.min(s * 1.2, 5))} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Zoom In">
              <ZoomIn size={18} />
            </button>
            <button onClick={() => setScale(s => Math.max(s / 1.2, 0.5))} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Zoom Out">
              <ZoomOut size={18} />
            </button>
            <div className="w-px bg-gray-300 mx-1"></div>
            <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Reset View">
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="bg-white/90 backdrop-blur shadow-lg rounded-lg p-1 flex space-x-1 border border-gray-200">
             <div className="flex items-center px-2">
                 <Search size={14} className="text-gray-400"/>
                 <input 
                    type="text" 
                    placeholder="Find Component..." 
                    className="bg-transparent border-none text-xs w-24 ml-1 focus:ring-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
                 {searchQuery && <button onClick={() => setSearchQuery('')}><XCircle size={12} className="text-gray-400 hover:text-red-500"/></button>}
             </div>
          </div>
        </div>

        <div className="pointer-events-auto flex space-x-2">
           <button 
             onClick={handleExportSVG}
             className="flex items-center bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg transition-colors hover:shadow-purple-500/30"
           >
             <Code size={14} className="mr-2" />
             Export SVG
           </button>

           <button 
             onClick={handleExportPNG}
             className="flex items-center bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg transition-colors hover:shadow-green-500/30"
           >
             <ImageIcon size={14} className="mr-2" />
             Export PNG
           </button>
           
           <div className="bg-white/90 backdrop-blur shadow-lg rounded-lg px-3 py-2 text-xs font-mono text-gray-600 border border-gray-200">
             {Math.round(scale * 100)}%
           </div>
        </div>
      </div>

      {/* CANVAS */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-move relative bg-grid-pattern"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleSvgClick}
      >
        <div 
          className="transform-gpu transition-transform duration-75 ease-linear origin-center relative"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
        >
          {/* Base SVG */}
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />

          {/* Terminal Highlights Overlay */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
              {connectionPoints.map((pt, i) => (
                  <circle 
                    key={i} 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={4} 
                    fill="#00ff9d" 
                    stroke="white" 
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
              ))}
          </svg>
        </div>
        
        {/* COMPONENT TOOLTIP OVERLAY */}
        {tooltip && (
          <div 
            className="absolute z-30 bg-black/90 text-white text-xs p-3 rounded-lg shadow-xl pointer-events-none animate-fade-in border border-neonBlue/30 backdrop-blur max-w-[200px]"
            style={{ 
                left: tooltip.x, 
                top: tooltip.y - 10,
                transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-bold text-neonBlue text-sm mb-1 flex items-center">
                <Zap size={12} className="mr-1"/> {tooltip.content.designator}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-300">
                <span className="text-gray-500">Type:</span> <span>{tooltip.content.type}</span>
                <span className="text-gray-500">Value:</span> <span className="text-white font-mono">{tooltip.content.value}</span>
            </div>
            {tooltip.content.description && (
                <div className="mt-2 pt-2 border-t border-white/10 text-gray-400 italic">
                    {tooltip.content.description}
                </div>
            )}
            <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black/90 rotate-45 border-r border-b border-neonBlue/30"></div>
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="bg-white border-t border-gray-200 p-2 flex justify-between items-center text-[10px] text-gray-500 z-20">
         <div className="flex space-x-4">
             <span className="flex items-center"><Move size={10} className="mr-1"/> Pan: Drag</span>
             <span className="flex items-center"><ZoomIn size={10} className="mr-1"/> Zoom: Ctrl+Scroll</span>
             <span className="flex items-center"><Zap size={10} className="mr-1"/> Trace: Click Component Terminals</span>
         </div>
         <div>
            {components ? `${components.length} Components Extracted` : 'Vector Mode'}
         </div>
      </div>
    </div>
  );
};
