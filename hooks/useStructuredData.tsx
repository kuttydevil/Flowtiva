import { useEffect } from 'react';

const SCRIPT_ID = 'dynamic-structured-data-script';

export const useStructuredData = (data: object) => {
  const jsonString = JSON.stringify(data);

  useEffect(() => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.innerHTML = jsonString;

    return () => {
      const scriptToRemove = document.getElementById(SCRIPT_ID);
      if (scriptToRemove) {
        if(scriptToRemove.parentNode) {
          scriptToRemove.parentNode.removeChild(scriptToRemove);
        }
      }
    };
  }, [jsonString]);
};