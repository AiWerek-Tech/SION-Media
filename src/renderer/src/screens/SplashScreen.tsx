import React from 'react'

interface SplashScreenProps {
  isLoading: boolean
}

export function SplashScreen({ isLoading }: SplashScreenProps): React.JSX.Element {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-base overflow-hidden relative">
      {/* Dynamic Aurora Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 w-[80%] h-[80%] rounded-full opacity-20 blur-[120px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, var(--color-brand-primary) 0%, transparent 70%)'
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[80%] h-[80%] rounded-full opacity-10 blur-[120px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, var(--color-brand-secondary) 0%, transparent 70%)',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 animate-fade-in">
        {/* Logo Container */}
        <div className="relative group">
          <div className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full scale-150 group-hover:scale-110 transition-transform duration-1000" />
          <div className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-brand-primary to-brand-secondary shadow-2xl flex items-center justify-center p-6 relative">
            <div className="w-full h-full rounded-full border-4 border-white/20 flex items-center justify-center">
              <span className="text-white text-5xl font-black italic select-none">S</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-text-primary">
            SION{' '}
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              Media
            </span>
          </h1>
          <p className="text-text-muted font-bold tracking-[0.3em] uppercase text-[10px] opacity-60">
            Worship Multimedia Platform
          </p>
        </div>

        {/* Loading Progress */}
        <div className="w-64 mt-4 space-y-4">
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className={`h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-700 ease-out ${
                isLoading ? 'w-2/3' : 'w-full'
              }`}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest animate-pulse">
              {isLoading ? 'Initializing System' : 'System Ready'}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-brand-primary animate-bounce" />
              <div className="w-1 h-1 rounded-full bg-brand-primary animate-bounce [animation-delay:0.2s]" />
              <div className="w-1 h-1 rounded-full bg-brand-primary animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-1">
          <p className="text-text-disabled text-[10px] font-bold tracking-widest">v3.0.0 AURORA</p>
          <p className="text-text-disabled/30 text-[8px] font-medium uppercase">
            © 2024 SION Presenter Team
          </p>
        </div>
      </div>
    </div>
  )
}
