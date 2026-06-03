import { useEffect, useState } from "react";
import type { BtoProject } from "../policies/policyConfig";
import { getBtoProjectsCached } from "../policies/btoDatasource";

type BtoProjectsState =
  | { status: "loading"; projects: BtoProject[]; error: null }
  | { status: "ready"; projects: BtoProject[]; error: null }
  | { status: "error"; projects: BtoProject[]; error: string };

const LOAD_ERROR = "Unable to load BTO data right now.";

export function useBtoProjects() {
  const [state, setState] = useState<BtoProjectsState>({
    status: "loading",
    projects: [],
    error: null,
  });
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    getBtoProjectsCached()
      .then((projects) => {
        if (!isCurrent) return;
        setState({ status: "ready", projects, error: null });
      })
      .catch(() => {
        if (!isCurrent) return;
        setState((current) => ({
          status: "error",
          projects: current.projects,
          error: LOAD_ERROR,
        }));
      });

    return () => {
      isCurrent = false;
    };
  }, [requestId]);

  const retry = () => {
    setState((current) => ({
      status: "loading",
      projects: current.projects,
      error: null,
    }));
    setRequestId((id) => id + 1);
  };

  return {
    projects: state.projects,
    isLoading: state.status === "loading",
    error: state.status === "error" ? state.error : null,
    retry,
  };
}
