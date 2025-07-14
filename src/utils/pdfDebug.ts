// Debug utilities for PDF processing
export function logPDFDebugInfo() {
  console.log('=== PDF Debug Info ===');
  console.log('User Agent:', navigator.userAgent);
  console.log('PDF.js Worker URL:', '/pdf.worker.min.js');
  
  // Test if worker file is accessible
  fetch('/pdf.worker.min.js', { method: 'HEAD' })
    .then(response => {
      console.log('Worker file accessible:', response.ok, response.status);
    })
    .catch(error => {
      console.error('Worker file not accessible:', error);
    });
    
  // Check if we're in a secure context (required for some PDF.js features)
  console.log('Secure context:', window.isSecureContext);
  
  // Check available memory (if supported)
  if ('memory' in performance) {
    console.log('Memory info:', (performance as any).memory);
  }
  
  console.log('=== End PDF Debug Info ===');
}

export function createPDFTestButton() {
  const button = document.createElement('button');
  button.textContent = 'Test PDF Worker';
  button.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:8px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;';
  
  button.onclick = () => {
    logPDFDebugInfo();
  };
  
  document.body.appendChild(button);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (button.parentNode) {
      button.parentNode.removeChild(button);
    }
  }, 10000);
}