function applyBlurAnimation() {
    const overlay = document.createElement('div');
    overlay.id = 'blur-overlay';
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 200);
  }