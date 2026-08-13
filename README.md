# GramVaani - Voice-Based Banking Application

A modern, accessible banking application built with voice-first interface capabilities. GramVaani enables users to perform banking operations through natural voice commands, making financial services accessible to everyone.

## 🎯 Overview

GramVaani is a React-based web application that leverages voice recognition and text-to-speech technologies to provide an intuitive banking experience. The application supports multiple languages and provides features like balance checking, money transfers, bill payments, and transaction history.

## ✨ Features

- **Voice Commands**: Interact with the application using natural voice commands
- **Multi-language Support**: Language selector for accessibility
- **Banking Operations**:
  - Check Account Balance
  - Send Money to Contacts
  - Pay Bills
  - View Transaction History
- **Voice PIN Security**: Biometric voice authentication for secure transactions
- **Real-time Conversation**: Interactive conversational interface with voice feedback
- **Status Tracking**: Real-time status updates for transactions
- **Responsive Design**: Mobile-first, accessible UI using Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Component Library**: Shadcn/ui (Radix UI components)
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form with Zod validation
- **State Management**: TanStack React Query

### Backend Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Edge Functions**: Supabase Functions

### Voice Integration
- **Speech-to-Text**: Browser Web Speech API
- **Text-to-Speech**: ElevenLabs API
- **Voice PIN**: Custom voice biometric system

### Testing
- **Test Framework**: Vitest
- **Component Testing**: Vitest + jsdom

### Package Manager
- **Bun** (Modern JavaScript runtime and package manager)

## 📋 Prerequisites

- Node.js 18+ or Bun
- Git
- A Supabase account (for backend services)
- ElevenLabs API key (for text-to-speech)

## 🚀 Getting Started

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Ayush-jaiswal18/Build-exe-GramVaani.git
cd Build-exe-GramVaani
```

2. **Install dependencies**
```bash
bun install
# or
npm install
```

3. **Set up environment variables**
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

4. **Start the development server**
```bash
bun run dev
# or
npm run dev
```

The application will be available at `http://localhost:5173`

## 📦 Project Structure

```
src/
├── components/
│   ├── BalanceCard.tsx           # Account balance display
│   ├── ConversationBubble.tsx    # Chat interface component
│   ├── LanguageSelector.tsx      # Language switcher
│   ├── QuickAction.tsx           # Quick action buttons
│   ├── StatusBar.tsx             # Transaction status display
│   ├── TransactionItem.tsx       # Individual transaction display
│   ├── VoiceButton.tsx           # Voice input trigger
│   ├── VoicePinSetup.tsx         # Voice PIN enrollment
│   ├── VoicePinVerify.tsx        # Voice PIN verification
│   ├── VoiceWave.tsx             # Voice visualization
│   └── ui/                       # Shadcn/ui components library
├── hooks/
│   ├── useAuth.tsx               # Authentication logic
│   ├── useBanking.ts             # Banking operations
│   ├── useSpeechToText.ts        # Speech recognition
│   ├── useTextToSpeech.ts        # Text-to-speech
│   └── useVoicePin.ts            # Voice PIN authentication
├── pages/
│   ├── Auth.tsx                  # Login/signup page
│   ├── CheckBalance.tsx          # Balance inquiry
│   ├── PayBills.tsx              # Bill payment
│   ├── SendMoney.tsx             # Money transfer
│   ├── History.tsx               # Transaction history
│   └── NotFound.tsx              # 404 page
├── services/
│   └── voiceCommand.ts           # Voice command processing
├── integrations/
│   └── supabase/                 # Supabase integration
├── lib/
│   └── utils.ts                  # Utility functions
└── test/
    ├── example.test.ts           # Example tests
    └── setup.ts                  # Test setup
```

## 🎨 UI Components

The application uses Shadcn/ui components including:
- Buttons, Cards, Input fields
- Dialogs, Modals, Drawers
- Forms with validation
- Tabs, Accordions, Dropdowns
- Progress indicators
- Tooltips and popovers
- And many more...

## 🧪 Testing

Run tests in watch mode:
```bash
bun run test:watch
# or
npm run test:watch
```

Run tests once:
```bash
bun run test
# or
npm run test
```

## 🔨 Building

Create a production build:
```bash
bun run build
# or
npm run build
```

Preview the production build locally:
```bash
bun run preview
# or
npm run preview
```

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server |
| `build` | Build for production |
| `build:dev` | Build with development mode |
| `lint` | Run ESLint |
| `preview` | Preview production build |
| `test` | Run tests once |
| `test:watch` | Run tests in watch mode |

## 🔐 Security Features

- **Voice PIN Authentication**: Biometric voice-based authentication
- **Supabase Auth**: Secure user authentication
- **Environment Variables**: Sensitive data stored securely
- **HTTPS Ready**: Deployment-ready for production

## 🌍 Internationalization

The application supports multiple languages through the Language Selector component. Add new languages by extending the language configuration.

## 📱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

Requires browsers supporting:
- Web Speech API
- Web Audio API
- Fetch API

## 🚀 Deployment

### Deploy to Netlify
```bash
bun run build
# Deploy the 'dist' folder
```

### Deploy to Vercel
```bash
bun run build
# Connect your repository to Vercel
```

### Deploy to Azure
Configure Supabase environment variables in your deployment platform.

## 📚 Documentation

For more information on the technologies used:
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.io/docs)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Ayush Jaiswal** - Initial development
- **Piyush V Verma** - Contributor
- **Ambule Devid** - Contributor
- **Sahil Solanki** - Contributor`

## 🆘 Support

For issues and questions:
1. Check existing [GitHub Issues](https://github.com/Ayush-jaiswal18/Build-exe-GramVaani/issues)
2. Create a new issue with detailed information
3. Include steps to reproduce the problem

## 🎯 Roadmap

- [ ] Enhanced voice command recognition
- [ ] Additional banking features
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-factor authentication improvements
- [ ] Offline functionality

---

**Built with ❤️ for accessible banking**
