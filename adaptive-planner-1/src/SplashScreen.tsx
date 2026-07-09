import React from "react";

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-logo-wrap">
        <img src="/logo.png" alt="Adaptive Planner" className="splash-logo" />
      </div>
      <div className="splash-title">Adaptive Planner</div>
      <div className="splash-loader"><div className="splash-loader-bar"></div></div>
      <div className="splash-credit">Idea by Matin Saffar</div>
    </div>
  );
}
