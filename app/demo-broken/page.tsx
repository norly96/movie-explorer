// Throwaway demonstration for specs/deploy-ci (demonstration 6): this import
// cannot be resolved, so the build fails. The pull request is closed without
// merging.
import { missing } from "../does-not-exist";

export default function DemoBrokenPage() {
  return <p>{missing}</p>;
}
