/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocFromServer, 
  doc, 
  serverTimestamp,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  Mic, 
  Send, 
  Printer, 
  Save, 
  History, 
  Plus, 
  Trash2, 
  Loader2,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Settings,
  Menu,
  X,
  CreditCard,
  FileText,
  User as UserIcon,
  ChevronRight,
  QrCode,
  Type as TypeIcon,
  Upload,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Rnd } from 'react-rnd';
import OpenAI from 'openai';
import { db, auth } from './firebase';
import { QuotationState, QuotationFunction, TrainingRule, DesignSettings, CustomTextBlock } from './types';
import { DEFAULT_DESIGN, DEFAULT_QUOTATION, BLANK_QUOTATION, TERMS_AND_CONDITIONS, POLICY_SECTIONS } from './constants';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { Image as ImageIcon, Move, Maximize2, Palette } from 'lucide-react';

// Editable Text Component for Manual Edits
const EditableText = ({ 
  value, 
  onChange, 
  className,
  as: Component = 'span',
  style
}: { 
  value: string; 
  onChange: (val: string) => void; 
  className?: string;
  as?: any;
  style?: React.CSSProperties;
}) => {
  return (
    <Component
      contentEditable
      suppressContentEditableWarning
      style={style}
      className={cn(
        "outline-none transition-all rounded transition-all duration-200 border-b border-dashed border-transparent", 
        "hover:bg-[#5a5646]/10 hover:border-[#5a5646] focus:bg-[#5a5646]/10 focus:border-[#5a5646]",
        className
      )}
      onBlur={(e: React.FocusEvent<HTMLElement>) => onChange(e.currentTarget.textContent || '')}
    >
      {value}
    </Component>
  );
};

// Error handling based on instructions
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We throw a standardized error for debugging
  throw new Error(JSON.stringify(errInfo));
}

const QuotationImage = ({ img, onUpdate, onRemove, isSelected, onSelect }: { img: any, onUpdate: (u: any) => void, onRemove: () => void, isSelected: boolean, onSelect: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Rnd
      size={{ width: img.width, height: img.height }}
      position={{ x: (img.x / 100) * 800, y: (img.y / 100) * 1100 }}
      onDragStop={(_, d) => {
        onUpdate({ x: (d.x / 800) * 100, y: (d.y / 1100) * 100 });
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        onUpdate({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position,
        });
      }}
      bounds="parent"
      className={cn("z-[100] no-print", isSelected && "ring-2 ring-blue-500")}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="relative w-full h-full group">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => onUpdate({ url: reader.result as string });
              reader.readAsDataURL(file);
            }
          }} 
        />
        <img 
          src={img.url} 
          className="w-full h-full object-cover shadow-xl rounded-sm pointer-events-none" 
          referrerPolicy="no-referrer" 
        />
        
        {isSelected && (
          <div className="absolute -top-10 left-1/2 -track-x-1/2 flex gap-2 bg-white px-3 py-1.5 rounded-full shadow-xl no-print">
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-100 rounded-full text-brand-olive">
              <Upload size={14} />
            </button>
            <button onClick={onRemove} className="p-1.5 hover:bg-red-50 text-red-500 rounded-full">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </Rnd>
  );
};

const QuotationTextBlock = ({ block, onUpdate, onRemove, isSelected, onSelect }: { block: CustomTextBlock, onUpdate: (u: Partial<CustomTextBlock>) => void, onRemove: () => void, isSelected: boolean, onSelect: () => void }) => {
  return (
    <Rnd
      position={{ x: (block.x / 100) * 800, y: (block.y / 100) * 1100 }}
      onDragStop={(_, d) => {
        onUpdate({ x: (d.x / 800) * 100, y: (d.y / 1100) * 100 });
      }}
      enableResizing={false}
      bounds="parent"
      className={cn("z-[101] no-print shrink-0 cursor-move", isSelected && "ring-2 ring-blue-500 rounded")}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="relative group p-2">
        <EditableText 
          value={block.text}
          onChange={(val) => onUpdate({ text: val })}
          className="bg-transparent border-none min-w-[50px] inline-block whitespace-nowrap"
          style={{ 
            fontSize: `${block.fontSize}px`,
            fontWeight: block.fontWeight,
            color: block.color,
            fontFamily: block.fontFamily,
            textAlign: block.textAlign || 'left' as any
          }}
        />

        {isSelected && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white p-2 rounded-xl shadow-2xl border border-gray-100 no-print z-[200]">
             <div className="flex items-center gap-1 border-r pr-2">
               <button onClick={() => onUpdate({ fontSize: block.fontSize + 2 })} className="p-1 hover:bg-gray-100 rounded">+</button>
               <span className="text-[10px] font-bold w-6 text-center">{block.fontSize}</span>
               <button onClick={() => onUpdate({ fontSize: Math.max(8, block.fontSize - 2) })} className="p-1 hover:bg-gray-100 rounded">-</button>
             </div>
             <button 
               onClick={() => onUpdate({ fontWeight: block.fontWeight === 'bold' ? 'normal' : 'bold' })}
               className={cn("p-1.5 rounded", block.fontWeight === 'bold' ? "bg-brand-olive text-white" : "hover:bg-gray-100")}
             >
               <span className="font-bold px-1">B</span>
             </button>
             <input 
               type="color" 
               value={block.color} 
               onChange={(e) => onUpdate({ color: e.target.value })}
               className="w-6 h-6 border-0 p-0 overflow-hidden cursor-pointer rounded-full"
             />
             <button onClick={onRemove} className="p-1.5 hover:bg-red-50 text-red-400 rounded">
                <Trash2 size={14} />
             </button>
          </div>
        )}
      </div>
    </Rnd>
  );
};

const PrintTextBlock = ({ block }: { block: CustomTextBlock }) => (
  <div 
    className="absolute z-[101] only-print"
    style={{ 
      left: `${block.x}%`, 
      top: `${block.y}%`,
      fontSize: `${block.fontSize}px`,
      fontWeight: block.fontWeight,
      color: block.color,
      fontFamily: block.fontFamily
    }}
  >
    {block.text}
  </div>
);

const PrintImage = ({ img }: { img: any, key?: any }) => (
  <div 
    className="absolute z-50 only-print"
    style={{ 
      left: `${img.x}%`, 
      top: `${img.y}%`, 
      width: `${img.width}px`
    }}
  >
    <img src={img.url} className="w-full h-auto" referrerPolicy="no-referrer" />
  </div>
);

const PUBLIC_UID = 'filmify_admin_default';

export default function App() {
  const [user, setUser] = useState<any>({ uid: PUBLIC_UID, email: 'admin@filmify.com' });
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [quotation, setQuotation] = useState<QuotationState>({
    ...DEFAULT_QUOTATION,
    userId: PUBLIC_UID,
    createdAt: new Date().toISOString()
  });
  const [history, setHistory] = useState<QuotationState[]>([]);
  const [rules, setRules] = useState<TrainingRule[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'settings' | 'history' | 'design'>('ai');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_key') || '');
  const [selectedElement, setSelectedElement] = useState<{ type: 'text' | 'image', id: string } | null>(null);
  const [newRuleTrigger, setNewRuleTrigger] = useState('');
  const [newRuleDeliverables, setNewRuleDeliverables] = useState('');

  const recognitionRef = useRef<any>(null);

  // Initialize (Simplified - No Auth)
  useEffect(() => {
    setIsAuthReady(true);
  }, []);

  // Sync History
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(
      collection(db, 'quotations'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuotationState));
      setHistory(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quotations');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Sync Training Rules
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(
      collection(db, 'settings', user.uid, 'rules'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TrainingRule));
      setRules(data);
    }, (error) => {
      console.error("Rules sync failed:", error);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        processAiCommand(transcript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const addRule = async () => {
    if (!user || !newRuleTrigger || !newRuleDeliverables) return;
    try {
      const deliverables = newRuleDeliverables.split(',').map(d => d.trim()).filter(d => d);
      await addDoc(collection(db, 'settings', user.uid, 'rules'), {
        trigger: newRuleTrigger,
        deliverables,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewRuleTrigger('');
      setNewRuleDeliverables('');
    } catch (error) {
      console.error("Add rule failed:", error);
    }
  };

  const deleteRule = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'settings', user.uid, 'rules', id));
    } catch (error) {
      console.error("Delete rule failed:", error);
    }
  };

  const processAiCommand = async (input: string) => {
    if (!input.trim() || isAiLoading) return;
    setIsAiLoading(true);

    try {
      let updatedData: any;
      
      const promptContext = `
        Current Date: ${new Date().toLocaleDateString()}
        Quotation State: ${JSON.stringify(quotation)}
        
        SMART RULES:
        ${rules.map(r => `- Keyword "${r.trigger}" -> Add Deliverables: ${r.deliverables.join(', ')}`).join('\n')}
        
        INSTRUCTIONS:
        1. If user mentions a name, update 'clientName'.
        2. If amount mentioned, update 'finalAmount'.
        3. If dates/events mentioned, update the 'functions' array.
        4. If keywords match Smart Rules, inject deliverables.
        5. Return ONLY a valid JSON object of the updated state.
      `;

      if (openaiKey) {
        const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: 'system', content: "You are a wedding quotation expert. Return JSON ONLY." },
            { role: 'user', content: promptContext },
            { role: 'user', content: input }
          ],
          response_format: { type: "json_object" }
        });
        updatedData = JSON.parse(response.choices[0].message.content || '{}');
      } else {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const response = await ai.models.generateContent({
           model: "gemini-2.0-flash",
           config: { responseMimeType: "application/json" },
           contents: [
             { role: 'user', parts: [{ text: `${promptContext}\n\nUser Request: ${input}` }] }
           ]
        });
        updatedData = JSON.parse(response.text || '{}');
      }

      if (updatedData) {
        setQuotation(prev => ({ ...prev, ...updatedData, userId: user?.uid }));
      }
      setPrompt('');
    } catch (error) {
      console.error("AI Logic Error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const saveQuotation = async () => {
    if (!user) return;
    setStatus('saving');
    try {
      const dataToSave = {
        ...quotation,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };
      
      if (quotation.id) {
        await setDoc(doc(db, 'quotations', quotation.id), dataToSave);
      } else {
        const docRef = await addDoc(collection(db, 'quotations'), dataToSave);
        setQuotation(prev => ({ ...prev, id: docRef.id }));
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'quotations');
      setStatus('error');
    }
  };

  const loadQuotation = (item: QuotationState) => {
    setQuotation(item);
    setShowHistory(false);
  };

  const addItem = (type: 'preWedding' | 'final') => {
    if (type === 'preWedding') {
      setQuotation({
        ...quotation,
        preWeddingDeliverables: [...quotation.preWeddingDeliverables, "NEW DELIVERABLE"]
      });
    } else {
      setQuotation({
        ...quotation,
        finalDeliverables: [...quotation.finalDeliverables, "NEW DELIVARABLE"]
      });
    }
  };

  const removeItem = (type: 'preWedding' | 'final', index: number) => {
    if (type === 'preWedding') {
      const next = [...quotation.preWeddingDeliverables];
      next.splice(index, 1);
      setQuotation({ ...quotation, preWeddingDeliverables: next });
    } else {
      const next = [...quotation.finalDeliverables];
      next.splice(index, 1);
      setQuotation({ ...quotation, finalDeliverables: next });
    }
  };

  const addFunction = () => {
    setQuotation({
      ...quotation,
      functions: [
        ...quotation.functions,
        { date: "NEW DATE", name: "NEW EVENT", time: "TIME SLOT", services: ["Service 1"] }
      ]
    });
  };

  const removeFunction = (index: number) => {
    const next = [...quotation.functions];
    next.splice(index, 1);
    setQuotation({ ...quotation, functions: next });
  };

  const addCustomImage = (url: string, page: number) => {
    const newImg = {
      id: Math.random().toString(36).substr(2, 9),
      url,
      x: 10,
      y: 10,
      width: 150,
      page
    };
    setQuotation(prev => ({
      ...prev,
      customImages: [...(prev.customImages || []), newImg]
    }));
  };

  const addCustomTextBlock = (page: number) => {
    const newBlock: CustomTextBlock = {
      id: Math.random().toString(36).substr(2, 9),
      text: "New Text Block",
      x: 20,
      y: 20,
      fontSize: 24,
      fontWeight: 'normal',
      color: '#5a5646',
      fontFamily: quotation.designSettings?.primaryFont || "'Playfair Display', serif",
      page
    };
    setQuotation(prev => ({
      ...prev,
      customTextBlocks: [...(prev.customTextBlocks || []), newBlock]
    }));
  };

  const updateCustomTextBlock = (id: string, updates: Partial<CustomTextBlock>) => {
    setQuotation(prev => ({
      ...prev,
      customTextBlocks: prev.customTextBlocks?.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeCustomTextBlock = (id: string) => {
    setQuotation(prev => ({
      ...prev,
      customTextBlocks: prev.customTextBlocks?.filter(b => b.id !== id)
    }));
  };

  const updateCustomImage = (id: string, updates: Partial<any>) => {
    setQuotation(prev => ({
      ...prev,
      customImages: prev.customImages?.map(img => img.id === id ? { ...img, ...updates } : img)
    }));
  };

  const removeCustomImage = (id: string) => {
    setQuotation(prev => ({
      ...prev,
      customImages: prev.customImages?.filter(img => img.id !== id)
    }));
  };

  const deleteQuotation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await deleteDoc(doc(db, 'quotations', id));
      if (quotation.id === id) createNew();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'quotations');
    }
  };

  // New Design State & Master Template logic
  const saveAsMasterTemplate = async () => {
    if (!user) return;
    try {
      setStatus('saving');
      await setDoc(doc(db, 'settings', user.uid, 'master', 'template'), quotation.designSettings || DEFAULT_DESIGN);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/master/template');
    }
  };

  const createBlankQuotation = async () => {
    const confirm = window.confirm("Start a new blank quotation? Unsaved changes will be lost.");
    if (!confirm) return;
    
    let initialDesign = DEFAULT_DESIGN;
    if (user) {
      try {
         const snap = await getDocFromServer(doc(db, 'settings', user.uid, 'master', 'template'));
         if (snap.exists()) initialDesign = snap.data() as DesignSettings;
      } catch (e) {}
    }

    setQuotation({
      ...BLANK_QUOTATION,
      designSettings: initialDesign,
      userId: user?.uid || PUBLIC_UID,
      createdAt: new Date().toISOString()
    });
    setActiveTab('ai');
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const createNew = () => {
    setQuotation({
      ...DEFAULT_QUOTATION,
      userId: user?.uid || '',
      createdAt: new Date().toISOString()
    });
  };

  // Main Preview Sections
  const renderPage1 = () => (
    <section className="quotation-page flex flex-col items-center justify-start min-h-[297mm] relative pt-24 pb-0 bg-white" onClick={() => setSelectedElement(null)}>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }} />
      
            {quotation.customImages?.filter(img => img.page === 0).map(img => (
                <div key={img.id} className="z-50">
                  <QuotationImage 
                    img={img} 
                    isSelected={selectedElement?.id === img.id}
                    onSelect={() => setSelectedElement({ type: 'image', id: img.id })}
                    onUpdate={(u) => updateCustomImage(img.id, u)} 
                    onRemove={() => removeCustomImage(img.id)} 
                  />
                  <PrintImage img={img} />
                </div>
            ))}

            {quotation.customTextBlocks?.filter(b => b.page === 0).map(block => (
                <div key={block.id} className="z-50">
                  <QuotationTextBlock 
                    block={block} 
                    isSelected={selectedElement?.id === block.id}
                    onSelect={() => setSelectedElement({ type: 'text', id: block.id })}
                    onUpdate={(u) => updateCustomTextBlock(block.id, u)} 
                    onRemove={() => removeCustomTextBlock(block.id)} 
                  />
                  <PrintTextBlock block={block} />
                </div>
            ))}
      
      <div className="relative z-10 w-full text-center space-y-12 mt-20 px-12">
          <EditableText
            as="h1"
            value={quotation.clientName}
            onChange={(val) => setQuotation({ ...quotation, clientName: val.toUpperCase() })}
            className="font-serif text-[100px] md:text-[140px] tracking-tight text-brand-olive uppercase leading-none font-black italic select-none"
            style={{ fontFamily: quotation.designSettings?.primaryFont }}
          />
          
          <div className="space-y-6 pt-8">
            <h2 className="font-serif text-2xl md:text-3xl tracking-[0.6em] text-brand-olive uppercase font-medium">ENGAGEMENT QUOTATION</h2>
            <div className="w-24 h-[1px] bg-brand-olive/30 mx-auto my-6" />
            <p className="text-xs md:text-md tracking-[0.3em] text-brand-olive/80 uppercase font-black max-w-lg mx-auto leading-relaxed">BOTH SIDES - MAHARAJA BANQUET, BADLAPUR</p>
          </div>
      </div>

      {/* Center Branding Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
          <div className="opacity-90 scale-90 md:scale-110">
            <img src={quotation.designSettings?.logoUrl || DEFAULT_DESIGN.logoUrl} className="w-56 h-auto" alt="Logo" referrerPolicy="no-referrer" />
          </div>
      </div>

      {/* Large Hero Couple Photo at bottom */}
      <div className="relative z-0 w-full max-w-5xl mx-auto px-0 pb-0 mt-auto overflow-hidden">
         <div className="aspect-[4/5] w-full overflow-hidden relative">
            <EditableText
              value={quotation.coverImage || "https://images.unsplash.com/photo-1542045890-484196d42f53?auto=format&fit=crop&q=80&w=1200"}
              onChange={(val) => setQuotation({ ...quotation, coverImage: val })}
              className="absolute top-4 right-4 z-20 text-[10px] bg-brand-olive text-white p-3 rounded-full no-print opacity-0 hover:opacity-100 transition-opacity font-bold uppercase tracking-widest shadow-xl"
            />
            <img 
              src={quotation.coverImage || "https://images.unsplash.com/photo-1542045890-484196d42f53?auto=format&fit=crop&q=80&w=1200"} 
              className="w-full h-full object-cover contrast-[1.1]" 
              referrerPolicy="no-referrer" 
            />
         </div>
      </div>
    </section>
  );

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f4f3ef] text-brand-green">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-serif animate-pulse">Initializing Filmify...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f3ef] overflow-hidden">
      <style>
        {`
          :root {
            --color-brand-olive: ${quotation.designSettings?.accentColor || '#5a5646'};
            --font-serif: ${quotation.designSettings?.primaryFont || "'Playfair Display', serif"};
          }
          .page-container {
            font-size: ${(quotation.designSettings?.fontScale || 1) * 100}%;
            width: 100%;
          }
          @media print {
            body, html {
              height: auto !important;
              overflow: visible !important;
              background-color: white !important;
            }
            .no-print {
              display: none !important;
            }
            .only-print {
              display: block !important;
            }
            .page-container {
              width: 100% !important;
              height: auto !important;
              display: block !important;
              overflow: visible !important;
            }
            .quotation-page {
              width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              position: relative !important;
              display: block !important;
              background-color: white !important;
              margin: 0 !important;
              overflow: hidden !important;
            }
            main {
              height: auto !important;
              overflow: visible !important;
              display: block !important;
            }
          }
        `}
      </style>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 right-4 z-[100] p-3 bg-brand-green text-white rounded-2xl shadow-xl lg:hidden no-print"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Controls */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[90] lg:relative lg:translate-x-0 transition-transform duration-300 w-96 bg-white border-r border-gray-200 flex flex-col no-print",
        isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-8 border-b border-gray-100 bg-brand-bg">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-olive flex items-center justify-center rounded-xl shadow-lg shadow-brand-olive/20">
                <span className="text-white font-serif text-xl font-bold">F</span>
             </div>
             <div>
                <h1 className="font-serif text-2xl font-bold text-brand-olive tracking-tight leading-none">Filmify Admin</h1>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">AI Quotation Dashboard</p>
             </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-6 pt-6 gap-2">
           {[
             { id: 'ai', icon: Mic, label: 'Chat' },
             { id: 'design', icon: Palette, label: 'Design' },
             { id: 'settings', icon: Settings, label: 'Rules' },
             { id: 'history', icon: History, label: 'History' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={cn(
                 "flex-1 py-3 px-1 rounded-2xl text-[9px] uppercase font-bold tracking-tight transition-all border flex flex-col items-center gap-1",
                 activeTab === tab.id 
                   ? "bg-brand-olive text-white border-brand-olive shadow-lg shadow-brand-olive/20" 
                   : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-white"
               )}
             >
               <tab.icon size={14} />
               {tab.label}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
             {activeTab === 'ai' && (
               <motion.div 
                 key="ai"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="space-y-6"
               >
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle2 size={12} className="text-brand-green" /> 
                       Live Editing Active
                    </h3>
                    <button 
                      onClick={createBlankQuotation}
                      className="w-full p-4 border border-dashed border-gray-200 text-gray-400 rounded-3xl text-[9px] font-black uppercase tracking-[0.2em] hover:border-brand-green hover:text-brand-green transition-all flex items-center justify-center gap-2 no-print"
                    >
                       <Plus size={14} /> Start with Blank Template
                    </button>
                    <div className="relative">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="E.g. 'Rahul, 1.5L, Haldi 1 Jan, apply Cinematic rules...'"
                        className="w-full h-40 p-5 text-sm bg-gray-50 border border-gray-200 rounded-[2rem] focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green transition-all pr-14 shadow-inner"
                      />
                      <button 
                        onClick={toggleListening}
                        className={cn(
                          "absolute right-4 top-4 p-3 rounded-2xl transition-all shadow-sm",
                          isListening ? "bg-red-500 text-white animate-pulse scale-110" : "bg-white text-gray-400 hover:text-brand-green"
                        )}
                      >
                        <Mic size={20} />
                      </button>
                    </div>
                    <button
                      onClick={() => processAiCommand(prompt)}
                      disabled={!prompt.trim() || isAiLoading}
                      className="w-full py-5 bg-brand-green text-white rounded-[2rem] font-bold text-sm shadow-xl shadow-brand-green/30 hover:shadow-brand-green/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                      {isAiLoading ? 'AI is dreaming...' : 'Update Quotation'}
                    </button>
                    
                    {/* Visual Assets Manager */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black tracking-widest text-gray-400 uppercase flex items-center gap-2">
                             <ImageIcon size={12} className="text-brand-green" /> Visual Assets
                          </h4>
                          <button 
                            onClick={() => {
                              const url = window.prompt("Enter Image/PNG URL:", "");
                              if (url) addCustomImage(url, 0);
                            }}
                            className="p-1 px-3 bg-brand-green/5 text-brand-green rounded-full text-[8px] font-black uppercase hover:bg-brand-green hover:text-white transition-all shadow-sm"
                          >
                             Add PNG/Image
                          </button>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {quotation.customImages?.map(img => (
                             <div key={img.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                                <img src={img.url} className="w-8 h-8 rounded-lg object-cover bg-white shadow-sm" referrerPolicy="no-referrer" />
                                <div className="flex-1 min-w-0">
                                   <select 
                                     value={img.page} 
                                     onChange={(e) => updateCustomImage(img.id, { page: parseInt(e.target.value) })}
                                     className="w-full text-[8px] font-black uppercase text-brand-green bg-transparent border-none appearance-none cursor-pointer"
                                   >
                                      {[0,1,2,3,4,5].map(p => <option key={p} value={p}>Page {p+1}</option>)}
                                   </select>
                                </div>
                                <button onClick={() => removeCustomImage(img.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-300 hover:text-red-500 transition-all">
                                   <Trash2 size={12} />
                                </button>
                             </div>
                          ))}
                          {(!quotation.customImages || quotation.customImages.length === 0) && (
                            <p className="text-[9px] text-gray-400 text-center py-4 italic border border-dashed border-gray-100 rounded-2xl">No custom assets added yet</p>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={saveQuotation}
                      className="p-5 bg-gray-900 text-white rounded-[2rem] flex flex-col items-center gap-2 hover:bg-black transition-all shadow-lg hover:shadow-xl"
                    >
                      {status === 'saving' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      <span className="text-[10px] uppercase font-bold tracking-widest">
                        {status === 'saved' ? 'Saved' : 'Save'}
                      </span>
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="p-5 bg-white border border-gray-100 rounded-[2rem] flex flex-col items-center gap-2 hover:bg-gray-50 transition-all shadow-sm group"
                    >
                      <Printer size={20} className="group-hover:text-brand-green transition-colors" />
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">PDF Export</span>
                    </button>
                 </div>
               </motion.div>
             )}

             {activeTab === 'settings' && (
               <motion.div 
                 key="settings"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="space-y-8"
               >
                 <div className="p-6 bg-brand-olive/5 rounded-[2rem] border border-brand-olive/10 space-y-4 mb-4">
                    <h3 className="text-xs font-bold text-brand-olive uppercase tracking-widest flex items-center gap-2">
                       <Settings size={14} /> AI Engine
                    </h3>
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-gray-400 uppercase">ChatGPT (OpenAI) API Key</label>
                       <input 
                         type="password"
                         value={openaiKey}
                         onChange={(e) => {
                            setOpenaiKey(e.target.value);
                            localStorage.setItem('openai_key', e.target.value);
                         }}
                         placeholder="sk-..."
                         className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-[10px] outline-none focus:ring-2 focus:ring-brand-olive font-mono"
                       />
                       <p className="text-[8px] text-gray-400 italic">Add your key to enable voice commands via GPT-4o.</p>
                    </div>
                 </div>

                 <div className="p-6 bg-brand-green/5 rounded-[2rem] border border-brand-green/10">
                    <h3 className="text-xs font-bold text-brand-green uppercase tracking-widest mb-4">Train Your AI</h3>
                    <div className="space-y-4">
                       <input 
                         type="text"
                         value={newRuleTrigger}
                         onChange={(e) => setNewRuleTrigger(e.target.value)}
                         placeholder="Keyword (e.g. Cinematic)"
                         className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green transition-all"
                       />
                       <textarea 
                         value={newRuleDeliverables}
                         onChange={(e) => setNewRuleDeliverables(e.target.value)}
                         placeholder="Deliverables (comma separated)"
                         className="w-full h-24 p-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green transition-all resize-none"
                       />
                       <button 
                         onClick={addRule}
                         className="w-full py-4 bg-brand-green text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-green/20"
                       >
                         Add Smart Rule
                       </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Rules</h4>
                    {rules.length === 0 ? (
                       <p className="text-xs text-gray-400 italic text-center py-6">No rules added yet...</p>
                    ) : (
                      rules.map(rule => (
                        <div key={rule.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-start justify-between group shadow-sm">
                           <div>
                              <p className="text-xs font-bold text-brand-green uppercase tracking-wider">{rule.trigger}</p>
                              <p className="text-[10px] text-gray-500 mt-1">{rule.deliverables.join(', ')}</p>
                           </div>
                           <button onClick={() => deleteRule(rule.id!)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                           </button>
                        </div>
                      ))
                    )}
                 </div>
               </motion.div>
             )}

             {activeTab === 'design' && (
                <motion.div 
                  key="design"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       <Palette size={12} className="text-brand-olive" /> Typography & Theme
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Primary Font (Serif)</label>
                        <select 
                          value={quotation.designSettings?.primaryFont}
                          onChange={(e) => setQuotation({...quotation, designSettings: {...quotation.designSettings!, primaryFont: e.target.value}})}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-serif outline-none focus:ring-2 focus:ring-brand-olive"
                        >
                          <option value="'Playfair Display', serif">Playfair Display</option>
                          <option value="'Libre Baskerville', serif">Libre Baskerville</option>
                          <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Global Logo</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={quotation.designSettings?.logoUrl}
                            onChange={(e) => setQuotation({...quotation, designSettings: {...quotation.designSettings!, logoUrl: e.target.value}})}
                            placeholder="Logo URL..."
                            className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] outline-none focus:ring-2 focus:ring-brand-olive"
                          />
                          <button 
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    setQuotation({...quotation, designSettings: {...quotation.designSettings!, logoUrl: reader.result as string}});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                            className="p-4 bg-brand-olive text-white rounded-2xl hover:opacity-90 transition-opacity"
                            title="Upload Logo"
                          >
                            <Upload size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Typography Scale</label>
                            <span className="text-[10px] font-mono text-brand-olive font-bold">{(quotation.designSettings?.fontScale || 1.0).toFixed(1)}x</span>
                         </div>
                         <input 
                           type="range" min="0.8" max="1.5" step="0.1" 
                           value={quotation.designSettings?.fontScale || 1}
                           onChange={(e) => setQuotation({...quotation, designSettings: {...quotation.designSettings!, fontScale: parseFloat(e.target.value)}})}
                           className="w-full accent-brand-olive h-1"
                         />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Brand Accent Color</label>
                         <div className="flex gap-2">
                           {['#5a5646', '#806e53', '#6b705c', '#333333', '#1e293b'].map(color => (
                             <button 
                               key={color}
                               onClick={() => setQuotation({...quotation, designSettings: {...quotation.designSettings!, accentColor: color}})}
                               className={cn(
                                 "w-9 h-9 rounded-full border-2 transition-all shadow-sm",
                                 quotation.designSettings?.accentColor === color ? "border-brand-olive scale-110" : "border-transparent"
                               )}
                               style={{ backgroundColor: color }}
                             />
                           ))}
                         </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 space-y-4 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight leading-relaxed px-4 italic">
                        "Saving as Default Template" will make this design the standard for all future quotations you create.
                      </p>
                      <button 
                        onClick={saveAsMasterTemplate}
                        disabled={status === 'saving'}
                        className="w-full py-5 bg-black text-white rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-olive transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                        {status === 'saving' ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        Save as Default Template
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

             {activeTab === 'history' && (
                <motion.div 
                  key="history_tab"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Quotations</h3>
                  {history.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 italic">No history found...</div>
                  ) : (
                    history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => loadQuotation(item)}
                        className="p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-serif text-lg text-brand-dark group-hover:text-brand-green transition-colors">{item.clientName}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                              <Calendar size={10} /> {format(new Date(item.createdAt), 'dd MMM yyyy')}
                            </p>
                            <p className="text-[10px] font-bold text-brand-green flex items-center gap-1 uppercase">
                              ₹ {new Intl.NumberFormat('en-IN').format(item.finalAmount)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-green transition-all translate-x-1" />
                      </div>
                    ))
                  )}
                </motion.div>
             )}
          </AnimatePresence>
        </div>

        {/* Status Bar */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Direct Access Mode
            </span>
          </div>
          {status === 'error' && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertCircle size={12} />
              <span className="text-[10px] font-bold">Error</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Preview Container */}
      <main className="flex-1 bg-[#e5e5e5] overflow-y-auto page-container scroll-smooth relative">
        {/* Floating Print Action */}
        <div className="fixed bottom-8 right-8 z-[200] no-print">
           <button 
             onClick={() => window.print()}
             className="bg-brand-olive text-white p-6 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-3 font-black uppercase tracking-[0.2em] text-xs"
           >
             <Download size={24} />
             Download PDF (A4)
           </button>
        </div>
        <div className="max-w-[210mm] mx-auto py-12 space-y-8 no-print px-4">
           <div className="px-8 py-6 bg-amber-50 border border-amber-200 rounded-[2.5rem] flex items-center gap-4 text-amber-700 text-sm font-bold uppercase tracking-widest shadow-xl">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle size={20} /> 
              </div>
              <p>Pro Tip: Tap any text in the preview to edit manually. AI learns from your changes.</p>
           </div>
        </div>

        <div className="page-container mb-20">
          {renderPage1()}

          <section className="quotation-page flex flex-col min-h-[297mm] relative overflow-hidden bg-white p-20" onClick={() => setSelectedElement(null)}>
            {quotation.customImages?.filter(img => img.page === 1).map(img => (
                <div key={img.id}>
                  <QuotationImage 
                    img={img} 
                    isSelected={selectedElement?.id === img.id}
                    onSelect={() => setSelectedElement({ type: 'image', id: img.id })}
                    onUpdate={(u) => updateCustomImage(img.id, u)} 
                    onRemove={() => removeCustomImage(img.id)} 
                  />
                  <PrintImage img={img} />
                </div>
            ))}
            {quotation.customTextBlocks?.filter(b => b.page === 1).map(block => (
                <div key={block.id}>
                  <QuotationTextBlock 
                    block={block} 
                    isSelected={selectedElement?.id === block.id}
                    onSelect={() => setSelectedElement({ type: 'text', id: block.id })}
                    onUpdate={(u) => updateCustomTextBlock(block.id, u)} 
                    onRemove={() => removeCustomTextBlock(block.id)} 
                  />
                  <PrintTextBlock block={block} />
                </div>
            ))}
            
            <div className="flex flex-col md:flex-row gap-16 mt-20">
                <div className="flex-1 space-y-12">
                    <div className="space-y-4">
                        <p className="text-[10px] tracking-[0.5em] text-brand-accent font-bold uppercase">The Storytellers</p>
                        <h2 className="font-serif text-6xl text-brand-olive leading-tight">About<br/>Our Craft</h2>
                    </div>
                </div>
            </div>
          </section>

          {/* PAGE 3: FUNCTIONS TIMELINE */}
          <section className="quotation-page py-24 min-h-[297mm] relative bg-white" onClick={() => setSelectedElement(null)}>
            {quotation.customImages?.filter(img => img.page === 2).map(img => (
                <div key={img.id}>
                  <QuotationImage 
                    img={img} 
                    isSelected={selectedElement?.id === img.id}
                    onSelect={() => setSelectedElement({ type: 'image', id: img.id })}
                    onUpdate={(u) => updateCustomImage(img.id, u)} 
                    onRemove={() => removeCustomImage(img.id)} 
                  />
                  <PrintImage img={img} />
                </div>
            ))}
            {quotation.customTextBlocks?.filter(b => b.page === 2).map(block => (
                <div key={block.id}>
                  <QuotationTextBlock 
                    block={block} 
                    isSelected={selectedElement?.id === block.id}
                    onSelect={() => setSelectedElement({ type: 'text', id: block.id })}
                    onUpdate={(u) => updateCustomTextBlock(block.id, u)} 
                    onRemove={() => removeCustomTextBlock(block.id)} 
                  />
                  <PrintTextBlock block={block} />
                </div>
            ))}
            <div className="flex flex-col items-center">
                {/* Visual Header matching user image */}
                <div className="flex items-center justify-center gap-10 w-full mb-24 px-12">
                    <div className="h-[1.5px] flex-1 max-w-[170px] bg-brand-olive/30 relative">
                       <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-brand-olive bg-white" />
                    </div>
                    <h2 className="font-serif text-5xl tracking-[0.2em] text-brand-olive uppercase font-bold text-center">Functions</h2>
                    <div className="h-[1.5px] flex-1 max-w-[170px] bg-brand-olive/30 relative">
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-brand-olive bg-white" />
                    </div>
                    <button 
                      onClick={addFunction}
                      className="p-3 bg-brand-olive/5 text-brand-olive rounded-full hover:bg-brand-olive hover:text-white transition-all no-print ml-4"
                    >
                      <Plus size={20} />
                    </button>
                </div>

                <div className="relative w-full">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-brand-olive/10 -translate-x-1/2" />
                    
                    <div className="space-y-16 relative">
                      {quotation.functions.map((func, index) => (
                        <div key={index} className="relative w-full flex flex-col items-center text-center px-10">
                            {/* The Dark Pill Header */}
                            <div className="bg-brand-olive text-white px-12 py-5 rounded-[3rem] shadow-xl mb-10 relative group inline-block min-w-[340px]">
                                <button 
                                  onClick={() => removeFunction(index)}
                                  className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity no-print shadow-xl"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <div className="flex flex-col gap-1 items-center">
                                  <div className="flex items-center gap-3">
                                      <EditableText 
                                        value={func.date} 
                                        onChange={(v) => {
                                          const next = [...quotation.functions];
                                          next[index].date = v;
                                          setQuotation({ ...quotation, functions: next });
                                        }}
                                        className="text-2xl font-bold tracking-widest uppercase font-serif" 
                                      />
                                      <span className="opacity-40 select-none px-2">•</span>
                                      <EditableText 
                                          value={func.name} 
                                          onChange={(v) => {
                                            const next = [...quotation.functions];
                                            next[index].name = v;
                                            setQuotation({ ...quotation, functions: next });
                                          }}
                                          className="text-2xl font-bold tracking-widest uppercase font-serif" 
                                        />
                                  </div>
                                  <EditableText 
                                    value={func.time} 
                                    onChange={(v) => {
                                      const next = [...quotation.functions];
                                      next[index].time = v;
                                      setQuotation({ ...quotation, functions: next });
                                    }}
                                    className="text-[10px] tracking-[0.4em] font-black uppercase opacity-60" 
                                  />
                                </div>
                            </div>
                            
                            {/* List of services underneath */}
                            <ul className="space-y-4 max-w-xl mx-auto mb-8 relative">
                                {func.services.map((s, si) => (
                                  <li key={si} className="flex items-center justify-center gap-4 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent/40 shrink-0 group-hover:bg-brand-olive transition-colors" />
                                    <EditableText 
                                      value={s}
                                      onChange={(v) => {
                                        const next = [...quotation.functions];
                                        next[index].services[si] = v;
                                        setQuotation({ ...quotation, functions: next });
                                      }}
                                      className="text-lg text-gray-700 font-medium tracking-wide"
                                    />
                                    <button 
                                      onClick={() => {
                                        const next = [...quotation.functions];
                                        next[index].services.splice(si, 1);
                                        setQuotation({ ...quotation, functions: next });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-red-300 no-print hover:text-red-500"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </li>
                                ))}
                                <button 
                                  onClick={() => {
                                    const next = [...quotation.functions];
                                    if (!next[index].services) next[index].services = [];
                                    next[index].services.push("NEW SERVICE");
                                    setQuotation({ ...quotation, functions: next });
                                  }}
                                  className="mx-auto block p-2 bg-gray-50 text-gray-300 rounded-full hover:bg-brand-olive hover:text-white transition-all no-print"
                                >
                                  <Plus size={12} />
                                </button>
                            </ul>
                        </div>
                      ))}
                    </div>
                </div>

                {/* Deliverables divider section */}
                <div className="w-full mt-32 space-y-16 px-12">
                    <div className="flex items-center gap-8">
                        <h3 className="font-serif text-5xl text-brand-olive font-bold tracking-[0.05em] shrink-0">Deliverables</h3>
                        <div className="h-px flex-1 bg-brand-olive/10" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12 max-w-6xl mx-auto">
                        {quotation.finalDeliverables.map((item, i) => (
                           <div key={i} className="flex items-start gap-5 group border-b border-brand-olive/5 pb-6">
                              <span className="text-[10px] font-black text-brand-olive/20 mt-1">{(i+1).toString().padStart(2, '0')}</span>
                              <div className="flex-1 flex items-center justify-between gap-4">
                                  <EditableText
                                     value={item}
                                     onChange={(val) => {
                                       const next = [...quotation.finalDeliverables];
                                       next[i] = val;
                                       setQuotation({ ...quotation, finalDeliverables: next });
                                     }}
                                     className="flex-1 text-sm text-gray-600 font-medium leading-relaxed uppercase tracking-widest"
                                  />
                                  <button 
                                    onClick={() => removeItem('final', i)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-300 no-print hover:text-red-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                              </div>
                           </div>
                        ))}
                    </div>
                    <button 
                      onClick={() => addItem('final')}
                      className="mx-auto flex items-center gap-3 p-4 bg-brand-olive/5 text-brand-olive rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-brand-olive hover:text-white transition-all no-print"
                    >
                      <Plus size={16} /> Add Deliverable
                    </button>
                </div>
            </div>
          </section>

          {/* PAGE 4: INVESTMENT & PAYMENT */}
          <section className="quotation-page flex flex-col py-32 min-h-[297mm] relative overflow-hidden bg-white" onClick={() => setSelectedElement(null)}>
             {quotation.customImages?.filter(img => img.page === 3).map(img => (
                <div key={img.id}>
                  <QuotationImage 
                    img={img} 
                    isSelected={selectedElement?.id === img.id}
                    onSelect={() => setSelectedElement({ type: 'image', id: img.id })}
                    onUpdate={(u) => updateCustomImage(img.id, u)} 
                    onRemove={() => removeCustomImage(img.id)} 
                  />
                  <PrintImage img={img} />
                </div>
             ))}
             {quotation.customTextBlocks?.filter(b => b.page === 3).map(block => (
                <div key={block.id}>
                  <QuotationTextBlock 
                    block={block} 
                    isSelected={selectedElement?.id === block.id}
                    onSelect={() => setSelectedElement({ type: 'text', id: block.id })}
                    onUpdate={(u) => updateCustomTextBlock(block.id, u)} 
                    onRemove={() => removeCustomTextBlock(block.id)} 
                  />
                  <PrintTextBlock block={block} />
                </div>
            ))}
             
             <div className="absolute inset-0 z-0 bg-cover bg-bottom opacity-[0.04] pointer-events-none" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1200')" }} />
             
             <div className="relative z-10 space-y-32">
                <div className="text-center space-y-16">
                    <p className="text-[10px] tracking-[0.8em] text-brand-accent font-black uppercase">The Total Worth</p>
                    <h2 className="font-serif text-7xl text-brand-olive leading-tight">Total<br/>Investment</h2>
                    
                    <div className="inline-block relative p-20 group">
                        {/* Recursive Circles */}
                        <div className="absolute inset-0 border border-brand-olive/10 rounded-full scale-110"></div>
                        <div className="absolute inset-0 border border-brand-olive/20 rounded-full group-hover:scale-[1.02] transition-transform duration-1000" />
                        <div className="flex flex-col items-center gap-4 bg-white/20 backdrop-blur-sm rounded-full p-20 border border-brand-olive/5 shadow-2xl">
                            <span className="text-[10px] uppercase font-black tracking-[0.4em] text-gray-400">Project Value</span>
                            <div className="flex items-center gap-4 text-brand-olive">
                                <span className="font-serif text-3xl italic opacity-30">₹</span>
                                <EditableText
                                  value={new Intl.NumberFormat('en-IN').format(quotation.finalAmount)}
                                  onChange={(val) => setQuotation({ ...quotation, finalAmount: parseInt(val.replace(/\D/g, '')) || 0 })}
                                  className="font-serif text-8xl md:text-[10rem] font-black italic tracking-tighter"
                                />
                                <span className="font-serif text-3xl italic opacity-30">/-</span>
                            </div>
                        </div>
                    </div>
 </div>

                <div className="space-y-10">
                    <div className="bg-brand-olive py-5 px-10 flex justify-between items-center shadow-xl">
                        <h2 className="font-serif text-xl tracking-[0.4em] text-white font-bold uppercase">Payment Schedule</h2>
                    </div>

                    <div className="px-4">
                        <table className="w-full text-center border-collapse">
                            <thead className="border-b border-brand-olive/20">
                                <tr className="uppercase tracking-[0.3em] font-black text-[9px] text-brand-olive">
                                    <th className="py-6 px-4">Milestone</th>
                                    <th className="py-6 px-4">Percentage</th>
                                    <th className="py-6 px-4">Amount</th>
                                    <th className="py-6 px-4">Condition</th>
                                </tr>
                            </thead>
                            <tbody className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                <tr className="border-b border-gray-100">
                                    <td className="py-8 px-4 text-brand-olive">Booking Advance</td>
                                    <td className="py-8 px-4">30%</td>
                                    <td className="py-8 px-4">₹{new Intl.NumberFormat('en-IN').format(quotation.finalAmount * 0.3)}</td>
                                    <td className="py-8 px-4 text-[8px] text-gray-400">To secure the dates</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-8 px-4 text-brand-olive">Event Milestone</td>
                                    <td className="py-8 px-4">40%</td>
                                    <td className="py-8 px-4">₹{new Intl.NumberFormat('en-IN').format(quotation.finalAmount * 0.4)}</td>
                                    <td className="py-8 px-4 text-[8px] text-gray-400">On Main Wedding Day</td>
                                </tr>
                                <tr>
                                    <td className="py-8 px-4 text-brand-olive">Final Delivery</td>
                                    <td className="py-8 px-4">30%</td>
                                    <td className="py-8 px-4">₹{new Intl.NumberFormat('en-IN').format(quotation.finalAmount * 0.3)}</td>
                                    <td className="py-8 px-4 text-[8px] text-gray-400">Before raw data handover</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bank Details Box */}
                <div className="p-12 border-2 border-brand-olive/10 bg-brand-bg rounded-sm flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-6">
                        <h4 className="font-serif text-2xl text-brand-olive">Banking & QR</h4>
                        <div className="grid grid-cols-1 gap-4 text-[10px] tracking-widest font-bold uppercase">
                            <p className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-400">A/C Name:</span> {quotation.bankDetails.accountName}</p>
                            <p className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-400">A/C Number:</span> {quotation.bankDetails.accountNumber}</p>
                            <p className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-400">IFSC Code:</span> {quotation.bankDetails.ifscCode}</p>
                        </div>
                    </div>
                    <div className="w-40 h-40 bg-white p-4 shadow-xl flex flex-col items-center justify-center border border-gray-100">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=7400341574@upi&pn=Filmify%20Weddings" className="w-full mb-2" referrerPolicy="no-referrer" />
                        <span className="text-[7px] font-black tracking-widest text-brand-olive">SCAN TO PAY</span>
                    </div>
                </div>
             </div>
          </section>

          {/* PAGE 5: TERMS & CONDITIONS */}
          <section className="quotation-page py-32 bg-white relative" onClick={() => setSelectedElement(null)}>
             {quotation.customImages?.filter(img => img.page === 4).map(img => (
                <div key={img.id}>
                  <QuotationImage 
                    img={img} 
                    isSelected={selectedElement?.id === img.id}
                    onSelect={() => setSelectedElement({ type: 'image', id: img.id })}
                    onUpdate={(u) => updateCustomImage(img.id, u)} 
                    onRemove={() => removeCustomImage(img.id)} 
                  />
                  <PrintImage img={img} />
                </div>
             ))}
             {quotation.customTextBlocks?.filter(b => b.page === 4).map(block => (
                <div key={block.id}>
                  <QuotationTextBlock 
                    block={block} 
                    isSelected={selectedElement?.id === block.id}
                    onSelect={() => setSelectedElement({ type: 'text', id: block.id })}
                    onUpdate={(u) => updateCustomTextBlock(block.id, u)} 
                    onRemove={() => removeCustomTextBlock(block.id)} 
                  />
                  <PrintTextBlock block={block} />
                </div>
            ))}

             <div className="px-16 space-y-24">
                <div className="flex items-baseline gap-6 border-b border-brand-olive/5 pb-10">
                   <h2 className="font-serif text-5xl text-brand-olive uppercase tracking-[0.2em] font-bold shrink-0">Terms & Conditions</h2>
                   <div className="h-px flex-1 bg-brand-olive/5" />
                   <span className="text-[8px] font-black text-gray-300 uppercase tracking-[1em]">05</span>
                </div>

                <div className="grid grid-cols-1 gap-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
                      {TERMS_AND_CONDITIONS.map((section, idx) => (
                         <div key={idx} className="space-y-6">
                            <h4 className="font-serif text-2xl text-brand-olive uppercase tracking-widest border-l-4 border-brand-olive/20 pl-6">{section.title}</h4>
                            <ul className="space-y-4 pl-6">
                               {section.items.map((item, i) => (
                                  <li key={i} className="flex gap-4 group">
                                     <span className="text-[9px] font-black text-brand-olive opacity-30 mt-1">{(i+1).toString().padStart(2, '0')}</span>
                                     <p className="text-[11px] text-gray-600 font-medium leading-relaxed tracking-wide">{item}</p>
                                  </li>
                               ))}
                            </ul>
                         </div>
                      ))}
                    </div>
                </div>
             </div>
          </section>

          {/* PAGE 6: POLICIES & CLOSER */}
          <section className="quotation-page flex flex-col py-32 bg-brand-dark text-white overflow-hidden relative" onClick={() => setSelectedElement(null)}>
             {quotation.customImages?.filter(img => img.page === 5).map(img => (
                <div key={img.id}>
                  <QuotationImage 
                    img={img} 
                    isSelected={selectedElement?.id === img.id}
                    onSelect={() => setSelectedElement({ type: 'image', id: img.id })}
                    onUpdate={(u) => updateCustomImage(img.id, u)} 
                    onRemove={() => removeCustomImage(img.id)} 
                  />
                  <PrintImage img={img} />
                </div>
             ))}
             {quotation.customTextBlocks?.filter(b => b.page === 5).map(block => (
                <div key={block.id}>
                  <QuotationTextBlock 
                    block={block} 
                    isSelected={selectedElement?.id === block.id}
                    onSelect={() => setSelectedElement({ type: 'text', id: block.id })}
                    onUpdate={(u) => updateCustomTextBlock(block.id, u)} 
                    onRemove={() => removeCustomTextBlock(block.id)} 
                  />
                  <PrintTextBlock block={block} />
                </div>
            ))}

             <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none flex items-center justify-center">
                <span className="font-serif text-[35vw] font-black uppercase tracking-tighter -rotate-12">FILMIFY</span>
             </div>

             <div className="relative z-10 px-16 space-y-32 h-full flex flex-col">
                <div className="grid grid-cols-2 gap-20">
                   {POLICY_SECTIONS.map((section, idx) => (
                      <div key={idx} className="space-y-12">
                         <h3 className="font-serif text-4xl text-brand-olive italic tracking-widest">{section.title}</h3>
                         <ul className="space-y-8">
                            {section.items.map((item, i) => (
                               <li key={i} className="flex gap-6 group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-olive mt-3 shrink-0 group-hover:scale-150 transition-transform" />
                                  <p className="text-[10px] text-white/50 font-black leading-loose uppercase tracking-[0.2em] group-hover:text-white transition-colors">{item}</p>
                                </li>
                            ))}
                         </ul>
                      </div>
                   ))}
                </div>

                <div className="mt-auto space-y-24 w-full">
                    <div className="text-center space-y-12">
                         <h4 className="font-serif text-6xl md:text-7xl text-white leading-[1.1] font-light">
                            Trust us to <br/> Capture your <br/><span className="italic text-brand-olive font-bold">Special Moments.</span>
                         </h4>
                         <div className="h-px w-24 bg-brand-olive mx-auto" />
                    </div>

                    <div className="flex flex-col items-center space-y-16 py-20 pb-32">
                      <div className="text-center space-y-6">
                        <motion.h2 
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          className="font-serif text-9xl tracking-[0.3em] font-black uppercase opacity-10"
                        >
                           THANK YOU
                        </motion.h2>
                        <p className="text-[12px] tracking-[2em] text-brand-olive uppercase font-black mt-[-4rem]">FILMIFY WEDDINGS</p>
                      </div>
                    </div>
                </div>
             </div>
          </section>
        </div>
      </main>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 no-print"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-serif text-2xl text-brand-green">Saved <span className="italic">Quotations</span></h3>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-brand-dark">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 italic">No quotations found...</div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => loadQuotation(item)}
                      className="p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-serif text-lg text-brand-dark group-hover:text-brand-green transition-colors">{item.clientName}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            <Calendar size={10} /> {format(new Date(item.createdAt), 'dd MMM yyyy')}
                          </p>
                          <p className="text-[10px] font-bold text-brand-green flex items-center gap-1 uppercase">
                            <IndianRupee size={10} /> {new Intl.NumberFormat('en-IN').format(item.finalAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => deleteQuotation(e, item.id!)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-green group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

