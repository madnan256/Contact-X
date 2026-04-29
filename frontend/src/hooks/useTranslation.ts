import { useLayout } from "@/contexts/LayoutContext";
import { t, Lang } from "@/lib/translations";

export function useTranslation() {
  const { dir } = useLayout();
  const lang: Lang = dir === "rtl" ? "ar" : "en";
  return { t: (key: string) => t(key, lang), lang, dir };
}
