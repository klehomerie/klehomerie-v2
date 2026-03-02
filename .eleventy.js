const { DateTime } = require("luxon");
const Image = require("@11ty/eleventy-img");
const path = require("path");
const fs = require("fs");

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
      widths: [1200], // Perfect for LinkedIn
      formats: ["jpeg"],
      outputDir: "./_site/assets/images/social/",
      urlPath: "/assets/images/social/",
      filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src);
        const name = path.basename(src, extension);
        return `${name}-social.${format}`;
      }
    });
filenameFormat: function (id, src, width, format, options) {
    const extension = path.extname(src);
    const name = path.basename(src, extension).replace(/[^a-z0-9]/gi, '-').toLowerCase(); // Clean filename
    return `${name}-social.${format}`;
}
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
  // 1. PASSTHROUGH COPIES (Move these files to the live site)
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // 2. FILTERS
  
  // Date Filter (e.g., "February 26, 2026")
  eleventyConfig.addFilter("dateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat("LLLL d, yyyy");
  });

  // Image Filter (Register the function we wrote above)
  eleventyConfig.addNunjucksAsyncFilter("socialImg", generateSocialImage);


  // 3. COLLECTIONS (This finds your Articles!)
  eleventyConfig.addCollection("posts", function(collection) {
    // Looks for any .md file inside src/klab/posts/
    return collection.getFilteredByGlob("src/klab/posts/*.md").reverse();
  });


  // 4. SHORTCODES
  
  // CTA: "Is this property sound?"
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


// 5. SETTINGS
  return {
    dir: {
      input: "src",          // Look for content in src/
      output: "_site",       // Output to _site/
      includes: "_includes", // Force look in src/_includes/
      layouts: "_includes"   // Explicitly tell it layouts are here too
    }
  };
};