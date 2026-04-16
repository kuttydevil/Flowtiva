// seo/sitemapGenerator.ts
// This script is intended to be run in a Node.js environment during a build process
// or on a server, as it requires file system access which isn't available in the browser.

interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

const generateSitemap = (urls: SitemapUrl[]): string => {
    const urlEntries = urls.map(url => {
        const lastmodTag = url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : '';
        const changefreqTag = url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : '';
        const priorityTag = url.priority ? `<priority>${url.priority}</priority>` : '';

        return `
    <url>
        <loc>${url.loc}</loc>${lastmodTag}${changefreqTag}${priorityTag}
    </url>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urlEntries}
</urlset>`;
};

// --- Example Usage ---
// In a real build script (e.g., using Node.js's `fs` module):
/*
import fs from 'fs';

const BASE_URL = 'https://flowtiva.vercel.app';
const today = new Date().toISOString().split('T')[0];

const pages: SitemapUrl[] = [
    {
        loc: `${BASE_URL}/`,
        lastmod: today,
        changefreq: 'monthly',
        priority: 1.0,
    },
    // Add other pages like /pricing, /about, etc. here
    // {
    //     loc: `${BASE_URL}/pricing`,
    //     lastmod: today,
    //     changefreq: 'monthly',
    //     priority: 0.8,
    // }
];

const sitemapContent = generateSitemap(pages);

fs.writeFileSync('public/sitemap.xml', sitemapContent);

console.log('✅ Sitemap generated successfully at public/sitemap.xml');
*/

// Exporting the function for potential use in other parts of a Node.js build
export { generateSitemap };