/**
 * 红果短剧广告 fplay 短路 / 清洗
 *
 * 二次抓包结论：
 * - 规则已命中 vas-*.snssdk.com/video/fplay/*?channel=novel_ad
 * - reject-dict 返回 {} 会触发 TTVideoEngine 对同一广告 vid 连续重试 10+ 次
 * - 需要返回结构完整、code!=0、video_list 为空的 JSON
 *
 * 用法：
 * - http-request：直接假响应，不打到源站
 * - http-response：若请求已放行，则清洗真实响应
 */
(function () {
  const url = ($request && $request.url) || "";
  const isAd =
    /[?&]channel=novel_ad(?:&|$)/.test(url) ||
    /[?&]encode_user_tag=ad/i.test(url);

  if (!isAd) {
    $done({});
    return;
  }

  const failBody = {
    code: 10009,
    message: "ad_blocked",
    video_info: {
      code: 10009,
      message: "ad_blocked",
      total: 0,
      data: {
        status: 20,
        message: "fail",
        enable_ssl: true,
        auto_definition: "",
        enable_adaptive: false,
        video_id: "",
        video_duration: 0,
        media_type: "video",
        url_expire: 0,
        video_list: {},
        poster_url: "",
        user_id: "",
        validate: "",
      },
    },
  };
  const bodyText = JSON.stringify(failBody);

  // http-request：直接返回假响应
  if (typeof $response === "undefined" || !$response) {
    $done({
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
        body: bodyText,
      },
    });
    return;
  }

  // http-response：清洗真实响应
  $done({
    response: {
      status: 200,
      headers: Object.assign({}, $response.headers || {}, {
        "Content-Type": "application/json; charset=utf-8",
      }),
      body: bodyText,
    },
  });
})();
