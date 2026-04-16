import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
}

export const useSEO = ({ title, description }: SEOProps) => {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Helper function to set or create meta tags
    const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
      let element = document.querySelector(`meta[${attr}='${value}']`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, value);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    
    // Set standard meta tags
    setMetaTag('name', 'description', description);

    // Set Open Graph tags for social sharing
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    
    // Set Twitter card tags
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

  }, [title, description]);
};
