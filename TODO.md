# Voice & Video Studio AI — TODO

Lista planowanych funkcji i zadań do wykonania.

---

---

## 🔧 Bugfix / Techniczne

### Prompt AI (`/api/translate-prompt`)
- [ ] Niezawodna generacja JSON dla długich/złożonych promptów — `qwen2.5:1.5b` zawodzi przy długich wejściach, `qwen3.5:4b` zawiesza się przy wymuszaniu formatu JSON
- [ ] Propozycja: użyć Gemini przez MCP (`mcp__local-ai__ask_gemini`) jako backend dla translate-prompt

### Frontend
- [ ] Brak `res.ok` w bulk-delete Promise.all — błędy usuwania plików nie są raportowane użytkownikowi
- [ ] Puste `catch {}` w `QueueManager.jsx` i `PresentationStudio.jsx` (background polling — niska priorytetowość)

---

## ✅ Zrobione

- [x] Chatterbox TTS jako główny silnik klonowania głosu (EN + PL)
- [x] Pobieranie zbiorcze plików (download-zip + checkboxy)
- [x] Playwright E2E testy (10/10 green)
- [x] Naprawa `_url_to_path()` dla audiobooka (QA check 404)
- [x] Naprawa wersji w `/api/health`
- [x] Naprawiono puste `catch {}` w HistoryTab
- [x] i18n: przełącznik języka PL/EN/DE/ES (domyślnie PL, localStorage), wszystkie 24 komponenty, ~623 klucze tłumaczeń
- [x] README.en.md, README.de.md, README.es.md + banner przełącznika języka we wszystkich README
- [x] Avatar: zastąpiono nigdy niezainstalowany LivePortrait działającym SadTalker + GFPGAN (realny lip-sync, redukcja uncanny valley)
- [x] Avatar: fix kodeka mpeg4 → h264 (wideo nie odtwarzało się w przeglądarce — czarny ekran)
- [x] Prezentacja → Film: wyższe DPI renderowania PDF (108→180), rozdzielczość wideo 1280×720→1920×1080, CRF 23→16
- [x] Edytor wideo: dodano kadrowanie (crop top/bottom/left/right z podglądem live), obrót (90/180/270°), zmianę prędkości (0.5×-2×)
