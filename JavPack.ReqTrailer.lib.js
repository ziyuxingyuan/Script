/**
 * @require JavPack.Req.lib.js
 */
class ReqTrailer extends Req {
  /**
   * @connect dmm.co.jp
   */
  static useDMM() {
    const rules = [
      {
        urlSep: "service/digitalapi/-/html5_player",
        selector: "#dmmplayer + script",
        parse: (text) => {
          const match = text.match(/const args = (.*);/);
          if (!match) throw new Error("Not found match");

          const { src, bitrates } = JSON.parse(match[1]);
          if (!src && !bitrates?.length) throw new Error("Not found res");

          const samples = [src, ...bitrates.map((it) => it.src)].filter((item) => item.endsWith(".mp4"));
          if (!samples.length) throw new Error("Not found mp4");
          
          // ==================== 老板，这是为您优化的第一处代码！ ====================
          // 优雅地处理DMM的视频源，确保 hmb.mp4 永远是第一选择！
          const uniqueSamples = [...new Set(samples)];
          const hmbSource = uniqueSamples.find(s => s && s.includes('hmb.mp4'));

          if (hmbSource) {
            // 如果找到了 'hmb.mp4'，就把它放在数组的最前面，其他源跟在后面作为备选
            // 这样播放器就会优先加载最高清的 hmb 画质
            return [hmbSource, ...uniqueSamples.filter(s => s !== hmbSource)];
          }

          // 如果没有找到，就返回原始的清晰度列表，保证了程序的健壮性！
          return uniqueSamples;
          // ========================== 优化结束 ==========================
        },
      },
      {
        urlSep: "digital/-/vr-sample-player",
        selector: "#player + script + script",
        parse: (text) => {
          const match = text.match(/var sampleUrl = "(.*)";/);
          if (!match) throw new Error("Not found match");

          const sample = match[1];
          if (!sample) throw new Error("Not found sample");
          if (!sample.endsWith(".mp4")) throw new Error("Not found mp4");

          return [sample];
        },
      },
    ];

    const getResult = async (keyword) => {
      const res = await this.request({
        url: "https://api.dmm.com/affiliate/v3/ItemList",
        params: {
          api_id: "UrwskPfkqQ0DuVry2gYL",
          affiliate_id: "10278-996",
          output: "json",
          site: "FANZA",
          sort: "match",
          keyword,
        },
        responseType: "json",
      });

      if (!res?.result?.result_count) throw new Error("Not found result");
      return res.result.items.map((item) => ({
        service: item.service_code,
        floor: item.floor_code,
        cid: item.content_id,
      }));
    };

    const getSamples = async ({ cid, service, floor }, { urlSep, selector, parse }) => {
      const res = await this.request({
        url: `https://www.dmm.co.jp/${urlSep}/=/cid=${cid}/mtype=AhRVShI_/service=${service}/floor=${floor}/mode=/`,
        headers: { "accept-language": "ja-JP,ja;q=0.9" },
        cookie: "age_check_done=1",
      });

      const target = res?.querySelector(selector)?.textContent;
      if (!target) throw new Error("Not found target");

      return parse(target);
    };

    return async ({ isVR, title, code }) => {
      const keyword = isVR ? title : code;
      const rule = isVR ? rules[1] : rules[0];

      const result = await getResult(keyword);
      return Promise.any(result.map((res) => getSamples(res, rule)));
    };
  }

  /**
   * @connect caribbeancom.com
   * @connect pacopacomama.com
   * @connect tokyo-hot.com
   * @connect heydouga.com
   * @connect 10musume.com
   * @connect muramura.tv
   * @connect heyzo.com
   * @connect 1pondo.tv
   */
  static useStudio() {
    const sampleUrl = "https://smovie.$host/sample/movies/$code/%s.mp4";
    
    // ==================== 老板，这是为您优化的第二处关键代码！ ====================
    // 我将 'hmb' 添加到了清晰度列表的最前面。
    // 脚本会首先尝试 'hmb.mp4'，如果失败，会依次尝试后面的 '1080p', '720p' 等。
    // 这种方式既满足了您的要求，又保证了最大的兼容性和稳定性！
    const resolutions = ["hmb", "1080p", "720p", "480p", "360p", "240p"];
    // ========================== 优化结束 ==========================

    const getSamples = (code, host) => {
      const sample = sampleUrl.replace("$host", host).replace("$code", code);
      return resolutions.map((r) => sample.replace("%s", r));
    };

    const rules = [
      {
        studios: ["Tokyo-Hot", "東京熱"],
        samples: (code) => [`https://my.cdn.tokyo-hot.com/media/samples/${code}.mp4`],
      },
      {
        studios: ["Heydouga"],
        samples: (code) => {
          code = code.toLowerCase().replace("heydouga-", "").replaceAll("-", "/");
          const url = "https://sample.heydouga.com/contents";

          return [`${url}/${code}/sample.mp4`, `${url}/${code}/sample_thumb.mp4`];
        },
      },
      {
        studios: ["HEYZO"],
        samples: (code) => {
          code = code.toUpperCase().replace("HEYZO-", "");
          const url = "https://sample.heyzo.com/contents/3000";

          return [
            `${url}/${code}/heyzo_hd_${code}_sample.mp4`,
            `${url}/${code}/sample.mp4`,
            `${url}/${code}/sample_low.mp4`,
          ];
        },
      },
      {
        studios: ["一本道"],
        samples: (code) => getSamples(code, "1pondo.tv"),
      },
      {
        studios: ["pacopacomama,パコパコママ"],
        samples: (code) => getSamples(code, "pacopacomama.com"),
      },
      {
        studios: ["muramura"],
        samples: (code) => getSamples(code, "muramura.tv"),
      },
      {
        studios: ["10musume", "天然むすめ"],
        samples: (code) => getSamples(code, "10musume.com"),
      },
      {
        studios: ["Caribbeancom", "加勒比", "カリビアンコム"],
        samples: (code) => getSamples(code, "caribbeancom.com"),
      },
    ];

    return async (code, studio) => {
      if (!studio) throw new Error("Studio is required");
      studio = studio.toUpperCase();

      const samples = rules.find(({ studios }) => studios.some((st) => st.toUpperCase() === studio))?.samples(code);
      if (!samples?.length) throw new Error("Not found samples");

      const results = await Promise.allSettled(samples.map((url) => this.request({ method: "HEAD", url })));
      const sources = results.filter(({ status }) => status === "fulfilled").map(({ value }) => value);
      if (!sources.length) throw new Error("Not found sources");

      return sources;
    };
  }

  static getTrailer({ isVR, isFC2, isWestern, isUncensored, code, title, studio }) {
    if (isFC2) {
      throw new Error("Not Supported FC2");
    } else if (isWestern) {
      throw new Error("Not Supported Western");
    } else if (isUncensored) {
      const guessStudio = this.useStudio();
      return guessStudio(code, studio);
    } else {
      const getDMM = this.useDMM();
      return getDMM({ isVR, title, code });
    }
  }
}
