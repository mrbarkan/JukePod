// Google AdSense settings. Every value here is public: it appears in the
// page source of any site that shows AdSense ads.
//
// While `client` is empty, the site loads nothing from AdSense and shows no
// ads. Fill it in to load the AdSense script on every page (needed for site
// verification and for Google's consent message), then add the ID of each ad
// unit you create under AdSense › Ads › By ad unit to show that ad.

export const ADS = {
  // Your publisher ID, for example "ca-pub-1234567890123456".
  client: "",
  // Ad unit IDs (the data-ad-slot number). An empty slot shows nothing.
  slots: {
    listing: "", // bottom of the side column on firmware, app and mod pages
    post: "", // end of each blog post
  },
};

export const adsOn = Boolean(ADS.client);

// The ads.txt contents: the line AdSense expects, or a comment while ads are off.
export function adsTxtLine() {
  if (!adsOn) return "# Quitanda shows no ads yet.\n";
  const pub = ADS.client.replace(/^ca-/, "");
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
}
