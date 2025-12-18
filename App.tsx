
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DriveBrowser } from './pages/DriveBrowser';
import { IntelligenceHub } from './pages/IntelligenceHub';
import { DocAnalysis } from './pages/DocAnalysis';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { VoiceAgent } from './components/VoiceAgent';
import { VoiceCommand, DriveFile, User } from './types';
import { authService } from './services/authService';
import { findBestMatchingFile } from './services/driveService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isVoiceAgentOpen, setVoiceAgentOpen] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState<VoiceCommand | null>(null);
  
  // State to handle "Chat with File" navigation
  const [selectedChatFile, setSelectedChatFile] = useState<DriveFile | null>(null);
  
  // State to handle Voice Email Drafting
  const [voiceEmailDraft, setVoiceEmailDraft] = useState<{to: string, topic: string, keyPoints: string} | null>(null);

  useEffect(() => {
    // Check for existing session
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
        setUser(currentUser);
        // Set initial tab based on role
        if (currentUser.role === 'ADMIN') setActiveTab('dashboard');
        else setActiveTab('analysis'); // Users default to Analysis
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'ADMIN') setActiveTab('dashboard');
    else setActiveTab('analysis');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const handleToolCall = async (name: string, args: any) => {
    console.log("Tool Call Received:", name, args);
    
    if (name === 'selectDocument') {
      const fileName = args.fileName;
      // Use robust fuzzy matching
      const foundFile = findBestMatchingFile(fileName);
      
      if (foundFile) {
          console.log("Voice Agent selected:", foundFile.name);
          setSelectedChatFile(foundFile); // This will trigger the effect in IntelligenceHub
          setActiveTab('intelligence');
          return { message: `Successfully selected file: ${foundFile.name}. Switching to Intelligence Hub.` };
      } else {
          // If not found for Intelligence Hub, maybe it's meant for Doc Analysis?
          // We fallback to setting the voice command for DocAnalysis to handle or just error.
          setVoiceCommand({ 
            type: 'SELECT_FILE', 
            payload: fileName, 
            id: Date.now().toString() 
          });
          setActiveTab('analysis');
          return { message: `I couldn't find an exact match for "${fileName}", but I've opened the Analysis tab for you to browse.` };
      }
    }
    
    if (name === 'startAnalysis') {
      setVoiceCommand({ 
        type: 'START_ANALYSIS', 
        payload: args.format, 
        id: Date.now().toString() 
      });
      setActiveTab('analysis');
      return { message: `Command sent to start analysis in ${args.format}` };
    }

    if (name === 'draftEmail') {
        setVoiceEmailDraft({
            to: args.to || '',
            topic: args.topic || 'General Update',
            keyPoints: args.keyPoints || ''
        });
        setActiveTab('intelligence');
        // Close voice agent so user can see the draft
        setVoiceAgentOpen(false);
        return { message: `Drafting email to ${args.to} about ${args.topic}. Check the Intelligence Hub.` };
    }
    
    return { error: 'Unknown tool' };
  };

  const handleChatWithFile = (file: DriveFile) => {
    setSelectedChatFile(file);
    setActiveTab('intelligence');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'drive': return <DriveBrowser onChatWithFile={handleChatWithFile} currentUser={user!} />;
      case 'intelligence': 
        return <IntelligenceHub 
                  preSelectedFile={selectedChatFile} 
                  voiceEmailDraft={voiceEmailDraft}
                  onDraftConsumed={() => setVoiceEmailDraft(null)}
               />;
      case 'analysis': 
        return <DocAnalysis voiceCommand={voiceCommand} onToggleVoice={() => setVoiceAgentOpen(true)} />;
      case 'settings': return <Settings currentUser={user!} />;
      default: return <div className="text-white">Page Not Found</div>;
    }
  };

  // Auth Guard
  if (!user) {
      return <Login onLoginSuccess={handleLogin} />;
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onToggleVoice={() => setVoiceAgentOpen(true)}
        currentUser={user}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
      
      <VoiceAgent 
        isOpen={isVoiceAgentOpen} 
        onClose={() => setVoiceAgentOpen(false)} 
        onToolCall={handleToolCall}
        userName={user.name}
      />
    </>
  );
};

export default App;
