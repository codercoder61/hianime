import axios from "axios";
import { Request, Response } from "express";
import { allowedExtensions, LineTransform } from "../utils/line-transform";

export const m3u8Proxy = async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json("url is required");

    const isStaticFiles = allowedExtensions.some(ext => url.endsWith(ext));
    const baseUrl = url.replace(/[^/]+$/, "");

    const response = await axios.get(url, {
  responseType: 'stream',
  headers: {
    Accept: "*/*",
    Referer: "https://cdn.dotstream.buzz/",
    Origin: "https://cdn.dotstream.buzz",
    Host: new URL(url).host,
    'User-Agent': req.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
});


    const headers = { ...response.headers };
    if (!isStaticFiles) delete headers['content-length'];

    res.cacheControl = { maxAge: headers['cache-control'] };
    res.set(headers);

    /*if (isStaticFiles) {
      return response.data.pipe(res);
    }*/

    /*const transform = new LineTransform(baseUrl);
    response.data.pipe(transform).pipe(res);*/
  } catch (error: any) {
    if (error.response) {
  console.error("Status:", error.response.status);
  console.error("Headers:", error.response.headers);
  error.response.data.on('data', chunk => console.error(chunk.toString()));
} else {
  console.error(error);
}

    res.status(500).send('Internal Server Error');
  }
}
