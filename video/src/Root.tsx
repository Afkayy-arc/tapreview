import { Composition } from "remotion";
import { Video, FPS, DURATION } from "./Video";
export const Root = () => (
  <Composition id="TapReview" component={Video} fps={FPS} durationInFrames={DURATION} width={1920} height={1080} />
);
