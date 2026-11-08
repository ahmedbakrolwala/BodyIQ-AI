import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type PreviewContextValue = {
  isPreview: boolean;
  setPreview: (v: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
};
const PreviewContext = createContext<PreviewContextValue>({
  isPreview: false,
  setPreview: () => {},
  reduceMotion: false,
  setReduceMotion: () => {},
});
export function DesignPreviewProvider({ children }: PropsWithChildren) {
  // Until preferences resolve, never display sample fitness records.
  const [isPreview, updatePreview] = useState(false);
  const [reduceMotion, updateMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("bodyiq:interface-preferences")
      .then((raw) => {
        if (!active) return;
        if (!raw) {
          updatePreview(true);
          return;
        }
        try {
          const prefs = JSON.parse(raw);
          updatePreview(
            typeof prefs.isPreview === "boolean" ? prefs.isPreview : true,
          );
          if (typeof prefs.reduceMotion === "boolean")
            updateMotion(prefs.reduceMotion);
        } catch {
          updatePreview(true);
        }
      })
      .catch(() => {
        if (active) updatePreview(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function persist(preview: boolean, motion: boolean) {
    void AsyncStorage.setItem(
      "bodyiq:interface-preferences",
      JSON.stringify({ isPreview: preview, reduceMotion: motion }),
    ).catch(() => {});
  }
  function setPreview(v: boolean) {
    updatePreview(v);
    persist(v, reduceMotion);
  }
  function setReduceMotion(v: boolean) {
    updateMotion(v);
    persist(isPreview, v);
  }
  return (
    <PreviewContext.Provider
      value={{ isPreview, setPreview, reduceMotion, setReduceMotion }}
    >
      {children}
    </PreviewContext.Provider>
  );
}
export function useDesignPreview() {
  return useContext(PreviewContext);
}
