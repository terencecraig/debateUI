/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Research metrics theme
        'research-blue': '#3B82F6',
        'research-green': '#10B981',
        'research-yellow': '#F59E0B',
        'research-red': '#EF4444',
        // Consensus states
        'consensus-strong': '#10B981',
        'consensus-moderate': '#F59E0B',
        'consensus-weak': '#EF4444',
        // Model provider colors
        anthropic: '#6366F1',
        openai: '#00A67E',
        meta: '#0467DF',
        google: '#4285F4',
        deepseek: '#FF6B35',
      },
    },
  },
  plugins: [],
};
