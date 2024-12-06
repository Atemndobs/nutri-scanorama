# Nutri-Scanorama

A modern, Progressive Web App (PWA) for scanning and managing nutritional information from grocery receipts, with a focus on REWE receipts.

## Features

### Core Functionality
- 📷 Receipt Scanning: Easily scan grocery receipts to extract item information
- 🔍 Smart Item Recognition: Advanced parsing system optimized for REWE receipts
- 📊 Nutritional Analysis: Get detailed nutritional information for scanned items
- 📱 PWA Support: Install as a native app on any device

### Organization
- 📁 Category Management: Organize items into customizable categories
- 🏷️ Smart Categorization: AI-powered automatic item categorization
- 📈 Top Categories: View your most frequent purchase categories
- 🕒 Recent Scans: Quick access to your latest scanned items

### Offline Capabilities
- 🔄 Offline Support: Full functionality even without internet connection
- ⚡ Background Sync: Automatic synchronization when back online
- 💾 Local Storage: Secure local database for all your data
- 🔔 Network Status Indicator: Real-time connection status monitoring

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Shadcn/ui
- **Database**: IndexedDB (Dexie.js)
- **AI Integration**: Ollama for smart categorization
- **PWA**: Service Workers + Workbox
- **State Management**: React Query + Context API

## Getting Started

### Prerequisites
- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- [Ollama](https://ollama.ai/) (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nutri-scanorama-v2.git

# Navigate to project directory
cd nutri-scanorama-v2

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
