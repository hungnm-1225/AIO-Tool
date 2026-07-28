const COBALT_MIRRORS = [
  "https://api.cobalt.tools",
  "https://cobalt-api.koyeb.app",
  "https://co.wuk.sh",
  "https://cobalt.q13.io",
  "https://cobalt.api.sc7.io",
  "https://cobalt.ray.so",
  "https://cobalt.boob.is",
  "https://cobalt.canine.tools",
  "https://cobalt.hyper.lol"
];

function decodeFbUrl(url) {
  try {
    let clean = url;
    if (clean.includes("\\")) {
      try {
        const escaped = clean.replace(/"/g, '\\"');
        clean = JSON.parse(`"${escaped}"`);
      } catch (err) {
        clean = clean
          .replace(/\\u0025/g, "%")
          .replace(/\\u003d/g, "=")
          .replace(/\\u0026/g, "&")
          .replace(/\\u002f/g, "/")
          .replace(/\\u003a/g, ":")
          .replace(/\\u003f/g, "?")
          .replace(/\\/g, "");
      }
    }
    return clean.replace(/&amp;/g, "&");
  } catch (e) {
    return url.replace(/\\/g, "").replace(/&amp;/g, "&");
  }
}

// Fallback stream logic is disabled

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let isFacebook = false;
  try {
    const query = req.query || {};
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const urlParam = query.url || body.url;
    const formatParam = query.format || body.format;
    const qualityParam = query.quality || body.quality;
    const audioOnlyParam = body.audioOnly === true || query.audioOnly === "true" || formatParam === "audio";

    if (!urlParam) {
      return res.status(400).json({ error: "URL is required" });
    }

    let targetUrl = urlParam.trim();
    isFacebook = targetUrl.toLowerCase().includes("facebook.com") || targetUrl.toLowerCase().includes("fb.watch") || targetUrl.toLowerCase().includes("fb.com");

    const needsRedirect = targetUrl.toLowerCase().includes("fb.watch") || 
                          targetUrl.toLowerCase().includes("fb.com") || 
                          targetUrl.toLowerCase().includes("/share");

    if (isFacebook && needsRedirect) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const redirectRes = await fetch(targetUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
          },
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (redirectRes.url) {
          const finalUrl = redirectRes.url;
          if (!finalUrl.includes("login.php") && !finalUrl.includes("/login") && !finalUrl.includes("/cookie/")) {
            targetUrl = finalUrl;
          }
          isFacebook = targetUrl.toLowerCase().includes("facebook.com") || targetUrl.toLowerCase().includes("fb.watch") || targetUrl.toLowerCase().includes("fb.com");
        }
      } catch (e) {
        console.log("FB redirect resolve error:", e);
      }
    }

    const isAudio = audioOnlyParam;
    const quality = qualityParam || "1080";

    // Helper to fetch media buffer server-side and stream back to client
    const streamBufferToClient = async (mediaUrl, defaultFilename = "vibe_code_download.mp4") => {
      try {
        const mediaStream = await fetch(mediaUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Referer": "https://www.facebook.com/"
          }
        });

        if (mediaStream.ok) {
          const buffer = await mediaStream.arrayBuffer();
          if (buffer.byteLength > 0) {
            const contentType = mediaStream.headers.get("content-type") || (isAudio ? "audio/mpeg" : "video/mp4");
            const ext = isAudio ? "mp3" : "mp4";
            const filename = defaultFilename.endsWith(`.${ext}`) ? defaultFilename : `${defaultFilename}.${ext}`;

            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.status(200).send(Buffer.from(buffer));
            return true;
          }
        }
      } catch (e) {
        console.warn("streamBufferToClient error:", e);
      }
      return false;
    };

    // 1. TIKTOK HANDLER (TikWM & Tiklydown)
    if (targetUrl.toLowerCase().includes("tiktok.com") || targetUrl.toLowerCase().includes("douyin")) {
      try {
        const tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}&hd=1`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (tikRes.ok) {
          const tikData = await tikRes.json();
          
          // Check if it's a photo slideshow
          if (tikData?.data?.images && Array.isArray(tikData.data.images) && tikData.data.images.length > 0) {
            return res.status(200).json({
              type: "gallery",
              platform: "tiktok",
              title: tikData.data.title || "TikTok Image Slideshow",
              items: tikData.data.images.map((img) => ({ type: "image", url: img }))
            });
          }

          const playStream = isAudio
            ? (tikData?.data?.music || tikData?.data?.play)
            : (tikData?.data?.hdplay || tikData?.data?.play);

          if (playStream) {
            let streamUrl = playStream;
            if (streamUrl.startsWith("//")) streamUrl = "https:" + streamUrl;
            else if (streamUrl.startsWith("/")) streamUrl = "https://www.tikwm.com" + streamUrl;

            const success = await streamBufferToClient(streamUrl, "vibe_code_download.mp4");
            if (success) return;
          }
        }
      } catch (e) {
        console.log("TikWM error, falling back...");
      }

      try {
        const tiklyRes = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(targetUrl)}`);
        if (tiklyRes.ok) {
          const tiklyJson = await tiklyRes.json();
          
          // Check if it's a photo slideshow in Tiklydown
          if (tiklyJson.images && Array.isArray(tiklyJson.images) && tiklyJson.images.length > 0) {
            return res.status(200).json({
              type: "gallery",
              platform: "tiktok",
              title: tiklyJson.title || "TikTok Image Slideshow",
              items: tiklyJson.images.map((img) => ({ type: "image", url: img.url || img }))
            });
          }

          const streamUrl = isAudio ? tiklyJson.music?.url : (tiklyJson.video?.noWatermark || tiklyJson.video?.watermark);
          if (streamUrl) {
            const success = await streamBufferToClient(streamUrl, "vibe_code_download.mp4");
            if (success) return;
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    // 2. INSTAGRAM & THREADS HANDLER (vxthreads / ddinstagram & Instagram embed scraper)
    if (targetUrl.toLowerCase().includes("instagram.com") || targetUrl.toLowerCase().includes("instagr.am") || targetUrl.toLowerCase().includes("threads.net") || targetUrl.toLowerCase().includes("threads.com")) {
      // Method A: DDInstagram / VXThreads OpenGraph Scraper
      try {
        const fixUrl = targetUrl
          .replace(/threads\.net/i, "vxthreads.net")
          .replace(/threads\.com/i, "vxthreads.net")
          .replace(/instagram\.com/i, "ddinstagram.com")
          .replace(/instagr\.am/i, "ddinstagram.com");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const fixRes = await fetch(fixUrl, {
          headers: {
            "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (fixRes.ok) {
          const html = await fixRes.text();
          
          // Match all og:video and og:image tags
          const videoUrls = Array.from(html.matchAll(/<meta[^>]+property=["']og:video(?::secure_url|_url)?["'][^>]+content=["']([^"']+)["']/gi)).map(m => m[1].replace(/&amp;/g, "&"));
          const imageUrls = Array.from(html.matchAll(/<meta[^>]+property=["']og:image(?::secure_url|_url)?["'][^>]+content=["']([^"']+)["']/gi)).map(m => m[1].replace(/&amp;/g, "&"));
          
          const items = [];
          
          // Add videos first
          for (const vUrl of videoUrls) {
            if (vUrl && !items.some(it => it.url === vUrl)) {
              items.push({ type: "video", url: vUrl });
            }
          }
          
          // Add images (filtering out duplicates or video placeholders)
          for (const imgUrl of imageUrls) {
            if (imgUrl && !items.some(it => it.url === imgUrl)) {
              items.push({ type: "image", url: imgUrl });
            }
          }

          if (items.length > 1) {
            return res.status(200).json({
              type: "gallery",
              platform: targetUrl.toLowerCase().includes("threads") ? "threads" : "instagram",
              title: targetUrl.toLowerCase().includes("threads") ? "Threads Carousel" : "Instagram Carousel",
              items: items
            });
          }

          const ogMatch = html.match(/<meta[^>]+property=["']og:video(:secure_url|_url)?["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(:secure_url|_url)?["']/i)
            || html.match(/<meta[^>]+name=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i);

          if (ogMatch) {
            const mediaUrl = (ogMatch[2] || ogMatch[1]).replace(/&amp;/g, "&");
            const success = await streamBufferToClient(mediaUrl, "vibe_code_download.mp4");
            if (success) return;
          } else if (items.length === 1) {
            const success = await streamBufferToClient(items[0].url, `instagram_media.${items[0].type === "video" ? "mp4" : "jpg"}`);
            if (success) return;
          }
        }
      } catch (e) {
        // Fallthrough
      }
    }

    // 3. YOUTUBE HANDLER (INVIDIOUS & PIPED APIS)
    if (targetUrl.toLowerCase().includes("youtube.com") || targetUrl.toLowerCase().includes("youtu.be")) {
      const ytIdMatch = targetUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytIdMatch && ytIdMatch[1]) {
        const videoId = ytIdMatch[1];

        // Invidious API
        const invidiousInstances = [
          `https://inv.tux.pizza/api/v1/videos/${videoId}`,
          `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
          `https://invidious.drgns.space/api/v1/videos/${videoId}`,
          `https://vid.puffyan.us/api/v1/videos/${videoId}`
        ];

        for (const invUrl of invidiousInstances) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            const invRes = await fetch(invUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (invRes.ok) {
              const invData = await invRes.json();
              if (Array.isArray(invData.formatStreams) && invData.formatStreams.length > 0) {
                const mp4Streams = invData.formatStreams.filter((s) => s.container === "mp4" || (s.type && s.type.includes("video/mp4")));
                const targetStream = mp4Streams.length > 0 ? mp4Streams[0].url : invData.formatStreams[0].url;
                if (targetStream) {
                  const success = await streamBufferToClient(targetStream, "vibe_code_download.mp4");
                  if (success) return;
                }
              }
            }
          } catch (e) {
            // next
          }
        }

        // Piped API
        const pipedInstances = [
          `https://api.piped.video/streams/${videoId}`,
          `https://pipedapi.kavin.rocks/streams/${videoId}`,
          `https://pipedapi.tokhmi.xyz/streams/${videoId}`
        ];

        for (const pUrl of pipedInstances) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            const pRes = await fetch(pUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (pRes.ok) {
              const pData = await pRes.json();
              let streamUrl = null;
              if (isAudio && pData.audioStreams?.length > 0) {
                streamUrl = pData.audioStreams[0].url;
              } else if (pData.videoStreams?.length > 0) {
                const withAudio = pData.videoStreams.filter((s) => s.videoOnly === false);
                streamUrl = withAudio.length > 0 ? withAudio[0].url : pData.videoStreams[0].url;
              }

              if (streamUrl) {
                const success = await streamBufferToClient(streamUrl, "vibe_code_download.mp4");
                if (success) return;
              }
            }
          } catch (e) {
            // next
          }
        }
      }
    }

    // 4. FACEBOOK HANDLER (NATIVE DIRECT HTML PARSER + EMBED PLUGIN FALLBACK + PHOTO ALBUM EXTRACTOR)
    if (isFacebook) {
      try {
        let html = "";
        
        // Step 4A. Fetch with facebookexternalhit first (unblocked meta-tags)
        try {
          const response = await fetch(targetUrl, {
            headers: {
              "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Referer": "https://www.facebook.com/"
            }
          });
          if (response.ok) {
            html = await response.text();
          }
        } catch (e) {
          console.log("FB crawler fetch error:", e);
        }

        // Step 4B. Fetch with Chrome User-Agent as fallback if crawler HTML is empty or blocked
        if (!html || (!html.includes("og:video") && !html.includes("playable_url") && !html.includes("browser_native") && !html.includes("scaled_image_url") && !html.includes("fna.fbcdn"))) {
          try {
            const response = await fetch(targetUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.facebook.com/"
              }
            });
            if (response.ok) {
              html = await response.text();
            }
          } catch (e) {
            console.log("FB chrome fetch error:", e);
          }
        }

        let videoUrl = null;
        if (html) {
          // 1. Try meta tags first
          const ogVideo = html.match(/<meta[^>]+property=["']og:video(?:_url|:secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?:_url|:secure_url)?["']/i) ||
                          html.match(/<meta[^>]+property=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i);
          if (ogVideo && ogVideo[1]) {
            videoUrl = decodeFbUrl(ogVideo[1]);
          }

          // 2. Try JSON script blocks if meta tags didn't work
          if (!videoUrl) {
            const jsonRegex = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
            let match;
            while ((match = jsonRegex.exec(html)) !== null) {
              const scriptContent = match[1];
              if (scriptContent.includes("playable_url") || scriptContent.includes("browser_native") || scriptContent.includes("hd_src")) {
                const hd = scriptContent.match(/(?:"browser_native_hd_url"|browser_native_hd_url)\s*:\s*["']([^"']+)["']/) ||
                           scriptContent.match(/(?:"playable_url_quality_hd"|playable_url_quality_hd)\s*:\s*["']([^"']+)["']/) ||
                           scriptContent.match(/(?:"hd_src_no_ratelimit"|hd_src_no_ratelimit|hd_src)\s*:\s*["']([^"']+)["']/);
                const sd = scriptContent.match(/(?:"browser_native_sd_url"|browser_native_sd_url)\s*:\s*["']([^"']+)["']/) ||
                           scriptContent.match(/(?:"playable_url"|playable_url)\s*:\s*["']([^"']+)["']/) ||
                           scriptContent.match(/(?:"sd_src_no_ratelimit"|sd_src_no_ratelimit|sd_src)\s*:\s*["']([^"']+)["']/);
                
                if (hd && hd[1]) {
                  const decoded = decodeFbUrl(hd[1]);
                  if (decoded && decoded.startsWith("https://")) {
                    videoUrl = decoded;
                    break;
                  }
                }
                if (sd && sd[1]) {
                  const decoded = decodeFbUrl(sd[1]);
                  if (decoded && decoded.startsWith("https://")) {
                    videoUrl = decoded;
                  }
                }
              }
            }
          }

          // 3. Match against whole HTML using improved regexes
          if (!videoUrl) {
            const hdMatch = html.match(/(?:"browser_native_hd_url"|browser_native_hd_url)\s*:\s*["']([^"']+)["']/) || 
                            html.match(/(?:"playable_url_quality_hd"|playable_url_quality_hd)\s*:\s*["']([^"']+)["']/) ||
                            html.match(/(?:"hd_src_no_ratelimit"|hd_src_no_ratelimit|hd_src)\s*:\s*["']([^"']+)["']/);
            
            const sdMatch = html.match(/(?:"browser_native_sd_url"|browser_native_sd_url)\s*:\s*["']([^"']+)["']/) || 
                            html.match(/(?:"playable_url"|playable_url)\s*:\s*["']([^"']+)["']/) ||
                            html.match(/(?:"sd_src_no_ratelimit"|sd_src_no_ratelimit|sd_src)\s*:\s*["']([^"']+)["']/);

            const matchedUrl = hdMatch ? hdMatch[1] : (sdMatch ? sdMatch[1] : null);
            if (matchedUrl) {
              videoUrl = decodeFbUrl(matchedUrl);
            }
          }
        }

        // If the extracted videoUrl is not a direct CDN stream link, treat it as a plugin/embed URL and extract from it
        if (videoUrl && !videoUrl.includes("fbcdn.net") && !videoUrl.includes(".mp4")) {
          targetUrl = videoUrl;
          videoUrl = null;
        }

        // Embed plugin fallback if direct page didn't provide a direct video URL
        if (!videoUrl) {
          try {
            const pluginUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(targetUrl)}`;
            const fbRes = await fetch(pluginUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html",
                "Referer": "https://www.facebook.com/"
              }
            });
            if (fbRes.ok) {
              const pluginHtml = await fbRes.text();
              const hdMatch = pluginHtml.match(/(?:"browser_native_hd_url"|browser_native_hd_url)\s*:\s*["']([^"']+)["']/) || 
                              pluginHtml.match(/(?:"playable_url_quality_hd"|playable_url_quality_hd)\s*:\s*["']([^"']+)["']/) ||
                              pluginHtml.match(/(?:"hd_src_no_ratelimit"|hd_src_no_ratelimit|hd_src)\s*:\s*["']([^"']+)["']/);
              
              const sdMatch = pluginHtml.match(/(?:"browser_native_sd_url"|browser_native_sd_url)\s*:\s*["']([^"']+)["']/) || 
                              pluginHtml.match(/(?:"playable_url"|playable_url)\s*:\s*["']([^"']+)["']/) ||
                              pluginHtml.match(/(?:"sd_src_no_ratelimit"|sd_src_no_ratelimit|sd_src)\s*:\s*["']([^"']+)["']/);

              const pluginOgMatch = pluginHtml.match(/<meta[^>]+property=["']og:video(?:_url|:secure_url)?["'][^>]+content=["']([^"']+)["']/i);

              const matchedUrl = hdMatch ? hdMatch[1] : (sdMatch ? sdMatch[1] : (pluginOgMatch ? pluginOgMatch[1] : null));
              if (matchedUrl) {
                videoUrl = decodeFbUrl(matchedUrl);
              }
            }
          } catch (e) {
            console.log("FB plugin fallback error:", e);
          }
        }

        if (videoUrl) {
          const cleanVideoUrl = decodeFbUrl(videoUrl);
          const success = await streamBufferToClient(cleanVideoUrl, "facebook_video.mp4");
          if (success) return;
        }

        // Facebook Photo Album or Photo post fallback
        if (!videoUrl && html) {
          const fbImages = [];
          
          // Match scaled_image_url
          const scaledMatches = html.match(/"scaled_image_url"\s*:\s*"([^"]+)"/g);
          if (scaledMatches) {
            for (const match of scaledMatches) {
              const urlMatch = match.match(/"scaled_image_url"\s*:\s*"([^"]+)"/);
              if (urlMatch && urlMatch[1]) {
                fbImages.push(urlMatch[1]);
              }
            }
          }
          
          // Match standard URI
          const uriMatches = html.match(/"image"\s*:\s*\{\s*"uri"\s*:\s*"([^"]+)"/g);
          if (uriMatches) {
            for (const match of uriMatches) {
              const urlMatch = match.match(/"uri"\s*:\s*"([^"]+)"/);
              if (urlMatch && urlMatch[1]) {
                fbImages.push(urlMatch[1]);
              }
            }
          }

          // Match meta og:image
          const ogImgMatches = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/g) ||
                               html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/g);
          if (ogImgMatches) {
            for (const match of ogImgMatches) {
              const urlMatch = match.match(/content=["']([^"']+)["']/);
              if (urlMatch && urlMatch[1]) {
                fbImages.push(urlMatch[1]);
              }
            }
          }

          const cleanUrls = fbImages.map(url => decodeFbUrl(url))
            .filter(url => url.startsWith("https://") && (url.includes("fbcdn") || url.includes("fna.fbcdn")));

          const uniqueFbUrls = Array.from(new Set(cleanUrls));
          if (uniqueFbUrls.length > 0) {
            return res.status(200).json({
              type: "gallery",
              platform: "facebook",
              title: "Facebook Photo Post",
              items: uniqueFbUrls.map(url => ({ type: "image", url }))
            });
          }
        }
      } catch (e) {
        console.log("FB native scrape error:", e);
      }
    }

    // 5. COBALT MIRRORS ROTATION (Universal Fallback)
    for (const mirror of COBALT_MIRRORS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(mirror, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            url: targetUrl,
            videoQuality: quality,
            downloadMode: "auto",
            isAudioOnly: isAudio,
            audioFormat: "mp3"
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const data = await response.json();

        // Check if Cobalt returned a multi-media album/picker (e.g. Instagram, Threads, TikTok carousel)
        if (data && data.picker && Array.isArray(data.picker) && data.picker.length > 1) {
          const plat = targetUrl.toLowerCase().includes("instagram") ? "instagram" : (targetUrl.toLowerCase().includes("threads") ? "threads" : (targetUrl.toLowerCase().includes("tiktok") ? "tiktok" : (targetUrl.toLowerCase().includes("facebook") ? "facebook" : "universal")));
          return res.status(200).json({
            type: "gallery",
            platform: plat,
            title: "Multi-Media Gallery",
            items: data.picker.map((item) => ({
              type: item.type === "video" ? "video" : "image",
              url: item.url
            }))
          });
        }

        if (data && (data.url || data.picker)) {
          const targetMediaUrl = data.url || (data.picker && data.picker[0]?.url);
          if (targetMediaUrl) {
            const success = await streamBufferToClient(targetMediaUrl, "vibe_code_download.mp4");
            if (success) return;
          }
        }
      } catch (err) {
        continue; // Try next mirror
      }
    }

    // 6. OPENGRAPH HTML SCRAPER FALLBACK
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const pageRes = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (pageRes.ok) {
        const html = await pageRes.text();
        const ogMatch = html.match(/<meta[^>]+property=["']og:video(:secure_url|_url)?["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(:secure_url|_url)?["']/i)
          || html.match(/"contentUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/i)
          || html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);

        if (ogMatch) {
          const rawUrl = (ogMatch[2] || ogMatch[1]).replace(/&amp;/g, "&");
          const success = await streamBufferToClient(rawUrl, "vibe_code_download.mp4");
          if (success) return;
        }
      }
    } catch (scrapErr) {
      // Fallthrough
    }

    // 7. DIRECT MEDIA URL CHECK
    if (/\.(mp4|mp3|m4a|webm|mov|ogg|flv)(\?.*)?$/i.test(targetUrl) || targetUrl.startsWith("data:")) {
      const success = await streamBufferToClient(targetUrl, "vibe_code_download.mp4");
      if (success) return;
    }

    // If it's a Facebook URL and we've reached here, it means we couldn't extract any media
    if (isFacebook) {
      return res.status(400).json({
        error: "Không thể lấy dữ liệu từ link Facebook này"
      });
    }

    return res.status(400).json({
      error: "Could not fetch media from active mirrors. Please try again later."
    });

  } catch (error) {
    console.error("Download proxy error:", error?.message || error);
    if (isFacebook) {
      return res.status(400).json({
        error: "Không thể lấy dữ liệu từ link Facebook này"
      });
    }
    return res.status(400).json({
      error: error?.message || "Could not fetch media from active mirrors. Please try again later."
    });
  }
}
