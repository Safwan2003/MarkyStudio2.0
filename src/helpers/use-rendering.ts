import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { CompositionProps } from "../../types/constants";
import { getLocalDownloadUrl, renderVideoLocally } from "../local/api";

export type State =
  | { status: "init" }
  | { status: "invoking" }
  | { status: "rendering"; progress: number }
  | { status: "error"; error: Error }
  | { status: "done"; url: string; size: number };

export const useRendering = (inputProps: z.infer<typeof CompositionProps>) => {
  const [state, setState] = useState<State>({ status: "init" });

  const renderMedia = useCallback(async () => {
    setState({ status: "invoking" });
    try {
      setState({ status: "rendering", progress: 0 });

      const { jobId, size } = await renderVideoLocally(inputProps, (progress) => {
        setState({ status: "rendering", progress });
      });

      setState({
        status: "done",
        url: getLocalDownloadUrl(jobId),
        size,
      });
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [inputProps]);

  const undo = useCallback(() => {
    setState({ status: "init" });
  }, []);

  return useMemo(() => ({ renderMedia, state, undo }), [renderMedia, state, undo]);
};
