import axios from "axios";
import { Request, Response } from "express";
import { allowedExtensions, LineTransform } from "../utils/line-transform";
import https from "https";

export const m3u8Proxy = async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url is required" });

    const isStaticFiles = allowedExtensions.some(ext => url.endsWith(ext));
    const baseUrl = url.replace(/[^/]+$/, "");

    console.log("Proxying:", url);

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        Accept: "*/*",
        Referer: "https://cdn.dotstream.buzz/",
        Origin: "https://cdn.dotstream.buzz",
        Host: new URL(url).host,
        "User-Agent":
          req.get("User-Agent") ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: () => true // Let us handle all statuses manually
    });

    if (response.status >= 400) {
      console.error("Upstream error:", response.status, response.statusText);
      res.status(response.status).send(`Upstream error: ${response.status}`);
      return;
    }

    const headers = { ...response.headers };
    if (!isStaticFiles) delete headers["content-length"];
    res.set(headers);

    if (isStaticFiles) {
      console.log("Serving static file directly...");
      return response.data.pipe(res);
    }

    try {
      console.log("Transforming m3u8 playlist...");
      const transform = new LineTransform(baseUrl);
      response.data.pipe(transform).pipe(res);
    } catch (transformErr) {
      console.error("LineTransform failed, streaming directly:", transformErr);
      response.data.pipe(res);
    }

  } catch (error: any) {
    console.error("Proxy error details:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      error.response.data.on("data", chunk => {
        console.error(chunk.toString());
      });
    } else {
      console.error(error);
    }
    res.status(500).send("Internal Server Error");
  }
};
