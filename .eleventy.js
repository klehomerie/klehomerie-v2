const { DateTime } = require("luxon");
const Image = require("@11ty/eleventy-img");
const path = require("path");
const fs = require("fs");
const markdownIt = require("markdown-it"); // 👈 NEW: Required for overriding markdown images
const pluginRss = require("@11ty/eleventy-plugin-rss").default;
/**
 * IMAGE PROCESSING FUNCTION (With Safety Check)
 * Automatically generates social media images from your posts.
 */
async function generateSocialImage(src) {
  // Default fallback image if none exists
  const defaultImage = "/assets/images/hero-athens-view.webp";

  if (!src) return defaultImage;

  // 1. Fix the path (CMS gives /assets/..., we need ./src/assets/...)
  let inputPath = "./src" + src;

  // 2. SAFETY CHECK: Does the file actually exist?
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Image not found: ${inputPath} — using default.`);
    return defaultImage; 
  }

try {
    // 3. Generate the image
    let metadata = await Image(inputPath, {
      widths: [600, 900, 1200], // Perfect for LinkedIn
      formats: ["jpeg"],
      outputDir: "./_site/assets/images/social/",
      urlPath: "/assets/images/social/",
      filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src);
        const name = path.basename(src, extension)
          .replace(/[^a-z0-9]/gi, '-') // Replaces quotes/spaces with dashes
          .toLowerCase();
        return `${name}-social.${format}`;
      }
    });

    // 4. Return the new URL
    return metadata.jpeg[0].url;

  } catch (e) {

    console.log(`⚠️  Error processing image: ${inputPath} — ${e.message}`);
    return defaultImage;
  }
}

module.exports = function(eleventyConfig) {

  // ADD THIS LINE AT THE TOP
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.addPlugin(pluginRss);

  // Cache-busting query param for style.css/script.js/content.js: these keep
  // the same filename across deploys but netlify.toml sets a 1-year
  // "immutable" Cache-Control on /assets/*, so without this, browsers that
  // cached a previous deploy's copy would never fetch the new one.
  eleventyConfig.addGlobalData("buildVersion", () => Date.now());
  // 1. PASSTHROUGH COPIES (Move these files to the live site)
  // NOTE: src/assets/css is intentionally excluded here — style.css is the
  // Tailwind build entry point and is compiled straight into _site by the
  // "tailwindcss" step in npm's build/start scripts. Passing it through
  // verbatim would overwrite the compiled CSS with the unprocessed source.
  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/*.pdf");
  eleventyConfig.addPassthroughCopy({
    "node_modules/vanilla-cookieconsent/dist/cookieconsent.css": "assets/css/cookieconsent.css",
    "node_modules/vanilla-cookieconsent/dist/cookieconsent.umd.js": "assets/js/cookieconsent.js"
  });
  // Tell Eleventy to copy the files straight from src/ to the root of your deployed site
eleventyConfig.addPassthroughCopy("src/KLEHOMERIE_SPECIMEN_AUDIT.pdf");
eleventyConfig.addPassthroughCopy("src/KLEHOMERIE_Services_Pricing_2026_Q1_EN.pdf");
eleventyConfig.addPassthroughCopy("src/KLEHOMERIE_Services_Pricing_2026_Q1_FR.pdf");
eleventyConfig.addPassthroughCopy("src/assets/Press_Kit.zip");
eleventyConfig.addPassthroughCopy("src/feed.xsl");
eleventyConfig.addPassthroughCopy("src/Arnaud_Zerdab.vcf");
eleventyConfig.addPassthroughCopy("src/arnaud-zerdab-logo.png");
// 👇 PASTE THE NEW PIECE HERE 👇
  eleventyConfig.addGlobalData("eleventyComputed", {
    permalink: data => {
      if (data.date && data.date > new Date()) {
        console.log(`🔒 [Future Guard] Skipping HTML generation for: ${data.page.inputPath}`);
        return false;
      }
      return data.permalink;
    }
  });
// 2. FILTERS
  
  // Date Filter
  eleventyConfig.addFilter("dateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat("LLLL d, yyyy");
  });

  // Machine-readable date for <time datetime="..."> attributes
  eleventyConfig.addFilter("dateISO", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat("yyyy-LL-dd");
  });

  // Image Filter
  eleventyConfig.addFilter("socialImg", generateSocialImage);

  // Strips HTML tags for use in structured data (JSON-LD) text fields
  eleventyConfig.addFilter("stripHtml", (str) => {
    return (str || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  });

 // 3. COLLECTIONS
  eleventyConfig.addCollection("posts", function(collection) {
    const allPosts = collection.getFilteredByGlob("src/klab/posts/*.md");
    const now = new Date(); // Captures the current exact date and time
    
    // Filter out posts with a date in the future
    const livePosts = allPosts.filter(post => post.date <= now);
    
    // 👇 DIAGNOSTIC LOGGING
    console.log(`\n🕵️‍♂️ ELEVENTY FOUND ${livePosts.length} LIVE POSTS:`);
    livePosts.forEach(post => {
      console.log(` - File: ${post.inputPath}`);
      console.log(`   URL generated: ${post.url}`);
    });
    console.log("------------------------\n");

    return livePosts.reverse(); // Returns only the past/present posts, newest first
  });
  // 4. SHORTCODES
  
  // CTA
  eleventyConfig.addShortcode("CTA_RED_FLAG", function() {
    return `
    <div class="my-8 p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-[--accent-color] rounded-r-lg not-prose">
      <h4 class="font-bold text-lg text-[--title-color] mb-2 m-0">🚩 Is this property actually sound?</h4>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        A listing description is marketing. My report is technical reality. Get an independent visual check before you make an offer.
      </p>
      <a href="/#contact" class="inline-block bg-[--accent-color] text-white font-bold py-2 px-6 rounded hover:bg-[#A94A2D] transition-colors no-underline">
        Verify this Property (€97)
      </a>
    </div>`;
  });

  // 👇 NEW: ASYNC SHORTCODE FOR TEMPLATE IMAGES (Hero, Slider, etc.)
  eleventyConfig.addAsyncShortcode("optimizedImage", async function(src, alt, sizes = "100vw", classes = "") {
    if (!src) return "";

    let inputPath = src.startsWith('/') ? "./src" + src : src;

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Image not found for shortcode: ${inputPath}`);
      return `<img src="${src}" alt="${alt}" class="${classes}">`; // Fallback to raw tag if missing
    }

    let metadata = await Image(inputPath, {
      widths: [400, 800, 1200],
      formats: ["webp", "jpeg"],
      urlPath: "/assets/images/optimized/",
      outputDir: "./_site/assets/images/optimized/"
    });

    let imageAttributes = {
      alt,
      sizes,
      class: classes,
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });

  // 👇 NEW: MARKDOWN-IT OVERRIDE FOR IMAGES IN THE BODY TEXT
  const mdLib = markdownIt({ html: true });
  
  mdLib.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const src = token.attrGet('src');
    const alt = token.content;
    
    // Applying the same CSS classes you have defined in post.njk for prose images
    const classes = "w-full mx-auto block rounded-xl shadow-lg transition-transform duration-200 hover:scale-[1.02] cursor-zoom-in";

    let inputPath = src.startsWith('/') ? "./src" + src : src;

    if (!fs.existsSync(inputPath)) {
        return `<figure><img src="${src}" alt="${alt}" class="${classes}"><figcaption class="sr-only">${alt}</figcaption></figure>`;
    }

    const imageOptions = {
        widths: [400, 800, 1200],
        formats: ["webp", "jpeg"],
        urlPath: "/assets/images/optimized/",
        outputDir: "./_site/assets/images/optimized/"
    };

    // Process image generation in the background
    Image(inputPath, imageOptions);

    // Use statsSync to generate the HTML tag synchronously (required for markdown-it)
    let metadata = Image.statsSync(inputPath, imageOptions);

    let imageAttributes = {
      alt: alt,
      sizes: "(max-width: 768px) 100vw, 800px",
      class: classes,
      loading: "lazy",
      decoding: "async"
    };

    return `<figure>${Image.generateHTML(metadata, imageAttributes)}<figcaption class="sr-only">${alt}</figcaption></figure>`;
  };

  // Tell Eleventy to use our modified markdown library
  eleventyConfig.setLibrary("md", mdLib);

  // 5. SETTINGS
  return {
    dir: {
      input: "src",          
      output: "_site",       
      includes: "_includes", 
      layouts: "_includes"   
    }
  };
};