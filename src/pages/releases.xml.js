import { releaseFeed } from "../lib/releases.js";

export const GET = ({ site }) => releaseFeed({ site });
