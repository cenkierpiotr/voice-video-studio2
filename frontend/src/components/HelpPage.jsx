import React, { useState } from 'react';
import { useT } from '../i18n/index.jsx';

const SECTIONS_PL = [
  {
    id: 'lektor',
    icon: '🗣',
    titleKey: 'help_tts_title',
    content: `
**Co to robi?**
Zamienia tekst na mowę przy użyciu głosów Microsoft Neural (edge-tts) lub Twojego sklonowanego głosu.

**Głosy gotowe (edge-tts)**
Działają natychmiast, bez GPU, wymagają połączenia z internetem. Dostępne głosy polskie (Marek, Zofia, Agnieszka) i angielskie oraz wiele innych języków.

**Głosy sklonowane (Chatterbox / XTTS)**
Wymagają GPU i wcześniej wgranej próbki głosu (zakładka Klonowanie). Generowanie trwa dłużej, ale głos brzmi jak Ty.

**Jak używać?**
1. Wybierz głos z listy lub wgraj próbkę głosu
2. Wpisz tekst w pole segmentu
3. Kliknij "Generuj audio"
4. Pobierz plik MP3 lub załaduj do edytora
    `.trim(),
  },
  {
    id: 'klonowanie',
    icon: '🎙',
    titleKey: 'help_clone_title',
    content: `
**Co to robi?**
Tworzy niestandardowy głos na podstawie 10–30-sekundowej próbki nagrania. Sklonowany głos może być użyty w Lektorze, Prezentacjach i Audiobookach.

**Jak wgrać próbkę?**
1. Przejdź do zakładki Klonowanie głosu
2. Wpisz nazwę głosu
3. Wgraj plik WAV/MP3 lub nagraj przez mikrofon
4. Wybierz język głosu
5. Kliknij generuj

Sklonowany głos pojawi się na liście głosów we wszystkich zakładkach.
    `.trim(),
  },
  {
    id: 'prezentacje',
    icon: '🖥️',
    titleKey: 'help_presentation_title',
    content: `
**Co to robi?**
Zamienia plik PPTX lub PDF w film MP4 z narracją lektora — jeden slajd to jeden segment głosowy.

**Jak używać?**
1. Wgraj plik PPTX lub PDF
2. Edytuj tekst narracji dla każdego slajdu
3. Wybierz głos lektora
4. Kliknij "Generuj film" — zadanie trafia do kolejki
5. Odbierz gotowy MP4 w zakładce Projekty
    `.trim(),
  },
  {
    id: 'audiobook',
    icon: '📖',
    titleKey: 'help_audiobook_title',
    content: `
**Co to robi?**
Zamienia plik EPUB lub TXT w audiobook z lektorem. System automatycznie wykrywa rozdziały.

**Jak używać?**
1. Wgraj plik EPUB lub TXT
2. Wybierz głos lektora
3. Opcjonalnie włącz analizę LLM
4. Kliknij "Generuj audiobook"
    `.trim(),
  },
  {
    id: 'transkrypcja',
    icon: '📝',
    titleKey: 'help_transcription_title',
    content: `
**Co to robi?**
Zamienia nagranie audio lub wideo na tekst. Obsługuje diaryzację za pomocą WhisperX.

**Jak używać?**
1. Wgraj plik audio lub wideo
2. Wybierz język (lub zostaw "Auto")
3. Włącz diaryzację jeśli potrzebna
4. Kliknij "Transkrybuj"
5. Pobierz wynik jako TXT lub SRT
    `.trim(),
  },
  {
    id: 'muzyka',
    icon: '🎵',
    titleKey: 'help_music_title',
    content: `
**Co to robi?**
Generuje podkład muzyczny na podstawie opisu słownego (MusicGen od Meta).

**Jak używać?**
1. Wpisz opis muzyki po angielsku
2. Ustaw długość (domyślnie 30 sekund)
3. Kliknij "Generuj muzykę"
4. Odbierz plik MP3
    `.trim(),
  },
  {
    id: 'demucs',
    icon: '🎚',
    titleKey: 'help_demucs_title',
    content: `
**Co to robi?**
Rozdziela nagranie audio na osobne ścieżki: wokal, perkusja, bas, pozostałe instrumenty.

**Jak używać?**
1. Wgraj plik audio (MP3, WAV, FLAC)
2. Wybierz tryb separacji (4-stem lub 2-stem)
3. Kliknij "Separuj ścieżki"
4. Pobierz poszczególne ścieżki osobno
    `.trim(),
  },
  {
    id: 'projekty',
    icon: '📂',
    titleKey: 'help_projects_title',
    content: `
**Co to robi?**
Pokazuje wszystkie wygenerowane pliki zapisane na serwerze.

**Działania**
- Kliknij nazwę folderu aby rozwinąć i zobaczyć pliki
- Pobierz plik przyciskiem ⬇️
- Zaznacz checkboxami i usuń wybrane pliki
- "Usuń wszystkie" — czyści całe wyjście serwera
    `.trim(),
  },
  {
    id: 'kolejka',
    icon: '📋',
    titleKey: 'help_queue_title',
    content: `
**Jak działa kolejka?**
Zadania wymagające GPU są przetwarzane jedno po drugim.

**Statusy zadań**
- 🕐 *Oczekuje* — zadanie czeka na swoją kolej
- ⚙️ *Przetwarzanie* — zadanie jest aktualnie wykonywane
- ✅ *Ukończone* — plik gotowy do pobrania
- ❌ *Błąd* — zadanie nie powiodło się

**Night Mode**
Możesz ustawić okno czasowe renderowania (np. 22:00–7:00).
    `.trim(),
  },
  {
    id: 'ustawienia',
    icon: '⚙️',
    titleKey: 'help_settings_title',
    content: `
**Ollama (AI do narracji)**
Adres i model Ollama używanego do generowania narracji.

**Prędkość XTTS**
Tempo mowy przy klonowaniu głosem XTTS. Zakres 0.7–1.3.

**Hasło dostępu**
Możesz ustawić hasło chroniące dostęp do aplikacji.

**Night Mode**
Godziny w których kolejka GPU jest aktywna.

**Czyszczenie cache**
Usuwa pliki tymczasowe z katalogu /tmp.
    `.trim(),
  },
  {
    id: 'prompt_ai',
    icon: '🤖',
    titleKey: 'help_prompt_ai_title',
    content: `
**Co to robi?**
Opisujesz słowami czego potrzebujesz — AI (Ollama / Qwen3) generuje gotową strukturę segmentów z przypisanymi głosami i parametrami prosodii (tempo, emocje).

**Jak używać?**
1. Wpisz opis dialogu lub narracji po polsku lub angielsku
2. Wybierz model Ollama (np. Qwen3, Llama3)
3. Kliknij "Generuj strukturę"
4. Edytuj wynikowe segmenty w Lektorze i generuj audio

**Obsługuje modele myślące**
Qwen3 i podobne modele oddzielają tok myślenia od odpowiedzi — system automatycznie extrahuje JSON z właściwego pola.
    `.trim(),
  },
  {
    id: 'mikser',
    icon: '🎛',
    titleKey: 'help_mixer_title',
    content: `
**Co to robi?**
Łączy do 4 niezależnych ścieżek audio w jeden plik. Możesz np. połączyć lektor + muzykę w tle + efekty dźwiękowe.

**Jak używać?**
1. Wgraj pliki audio na każdą ścieżkę (MP3, WAV)
2. Ustaw głośność każdej ścieżki suwakiem
3. Opcjonalnie włącz ducking (automatyczne ściszanie tła gdy lektor mówi)
4. Kliknij "Eksportuj" — wynik to plik MP3

**Ducking**
Automatycznie obniża głośność ścieżki muzycznej gdy na ścieżce lektora jest mowa.
    `.trim(),
  },
  {
    id: 'efekty',
    icon: '🎚',
    titleKey: 'help_effects_title',
    content: `
**Co to robi?**
Przetwarza pliki audio: usuwa szumy, zmienia charakter głosu (RVC), normalizuje głośność, zmienia wysokość tonu.

**Dostępne efekty**
- **Denoise** — usuwa szum tła (Demucs lub filtr ffmpeg)
- **Normalizacja** — wyrównuje głośność do standardu EBU R128 / ACX
- **Pitch shift** — przesuwa wysokość tonu w półtonach (ffmpeg)
- **RVC** — zmiana charakteru głosu z zachowaniem treści (wymaga modelu RVC)

**Jak używać?**
1. Wgraj plik audio
2. Wybierz efekt i ustaw parametry
3. Kliknij "Zastosuj"
4. Pobierz przetworzony plik
    `.trim(),
  },
  {
    id: 'avatar',
    icon: '👤',
    titleKey: 'help_avatar_title',
    content: `
**Co to robi?**
Animuje twarz ze zdjęcia lub obrazu tak, żeby "mówiła" zsynchronizowana z wygenerowanym dźwiękiem (lip-sync).

**Silniki (wybieralne w interfejsie)**
- **EchoMimic** — realistyczna animacja, wysoka jakość, wymaga więcej VRAM
- **SadTalker** — dobry balans jakości i szybkości, GFPGAN poprawia ostrość twarzy

**Jak używać?**
1. Wgraj zdjęcie twarzy (JPG/PNG)
2. Wgraj lub wygeneruj plik audio z mową
3. Wybierz silnik animacji
4. Kliknij "Generuj avatar" — wynik to plik MP4

Wymagane GPU. SadTalker działa od 6 GB VRAM, EchoMimic potrzebuje 8 GB+.
    `.trim(),
  },
  {
    id: 'generator_wideo',
    icon: '🎬',
    titleKey: 'help_video_gen_title',
    content: `
**Co to robi?**
Generuje krótki klip wideo z opisu tekstowego (text-to-video). Możesz opisać scenerię, akcję, styl.

**Dostępne silniki**
- **AnimateDiff** — 6 GB VRAM, szybki, dobre dla prostych animacji
- **WAN 2.1** — 8 GB VRAM, wyższa jakość ruchu
- **CogVideoX-5B** — 16 GB (lub 12 GB z CPU offload), najlepsza jakość
- **Runway** — zewnętrzne API, nie wymaga GPU, płatne

**Jak używać?**
1. Wybierz silnik (dostępne modele widoczne na podstawie VRAM)
2. Wpisz opis sceny po angielsku
3. Użyj "Asystent AI" jeśli chcesz pomocy w sformułowaniu promptu
4. Kliknij "Generuj wideo"
    `.trim(),
  },
  {
    id: 'animacja',
    icon: '✨',
    titleKey: 'help_animation_title',
    content: `
**Co to robi?**
Tworzy animację Ken Burns (powolny pan i zoom) na zdjęciu lub obrazie statycznym. Lżejsza alternatywa dla generowania wideo gdy brak wystarczającego VRAM.

**Jak używać?**
1. Wgraj zdjęcie (JPG/PNG)
2. Ustaw czas trwania (sekundy)
3. Wybierz kierunek ruchu (zoom-in, zoom-out, przesunięcie)
4. Kliknij "Generuj animację" — wynik to plik MP4

Nie wymaga GPU — działa na CPU przez ffmpeg.
    `.trim(),
  },
  {
    id: 'film',
    icon: '🎥',
    titleKey: 'help_film_title',
    content: `
**Co to robi?**
Tworzy wieloscenowy film MP4 z wieloma aktorami. Definiujesz scenariusz (sceny, dialogi, głosy aktorów) i system renderuje gotowy film.

**Jak używać?**
1. Dodaj sceny — każda scena to obraz/wideo + kwestia dialogowa
2. Przypisz głos do każdej kwestii (lista sklonowanych głosów)
3. Opcjonalnie wybierz silnik animacji scen (AnimateDiff lub statyczne klatki)
4. Kliknij "Renderuj film" — zadanie trafia do kolejki

Wynik to jeden plik MP4 z połączonymi scenami i zsynchronizowanym dźwiękiem.
    `.trim(),
  },
  {
    id: 'dialog',
    icon: '💬',
    titleKey: 'help_dialog_title',
    content: `
**Co to robi?**
Generuje rozmowę dwóch postaci. AI (Ollama) tworzy scenariusz dialogu z podanego tematu, XTTS/Chatterbox syntetyzuje kwestie każdego aktora osobno.

**Jak używać?**
1. Wpisz temat rozmowy
2. Przypisz głosy do Postaci A i Postaci B
3. Kliknij "Generuj dialog"
4. AI generuje scenariusz, system łączy kwestie w jeden plik audio

Wymaga działającego serwera Ollama z załadowanym modelem (konfiguracja w Ustawieniach).
    `.trim(),
  },
  {
    id: 'edycja',
    icon: '✂️',
    titleKey: 'help_editor_title',
    content: `
**Co to robi?**
Edytor wideo do podstawowych operacji: przycinanie, kadrowanie, obrót, zmiana prędkości, podmiana ścieżki audio, dodawanie napisów z pliku SRT.

**Dostępne operacje**
- **Trim** — wytnij fragment (od/do w sekundach)
- **Crop** — przytnij marginesy (piksele od krawędzi)
- **Obrót** — 90° / 180° / 270°
- **Prędkość** — 0.5× do 2× (audio i wideo zsynchronizowane)
- **Podmiana audio** — zastąp ścieżkę dźwiękową innym plikiem
- **Napisy** — nakładanie napisów z pliku SRT

Wszystkie operacje przez ffmpeg — podgląd przed eksportem.
    `.trim(),
  },
  {
    id: 'modele_ai',
    icon: '🧠',
    titleKey: 'help_models_title',
    content: `
**Co to robi?**
Katalog 22+ modeli AI w 5 kategoriach (TTS, Avatar, Wideo, Transkrypcja, Muzyka). Pozwala instalować, aktywować i porównywać modele bez restartu serwera.

**Jak używać?**
Otwórz Ustawienia → Modele AI.

**Na każdej karcie modelu widoczne:**
- Wymagania VRAM i kompatybilność z Twoim GPU
- Ocena jakości (★) i szybkości (⚡)
- Status: zainstalowany / aktywny / brak wag

**Auto-konfiguracja**
Przycisk "⚡ Auto-konfiguracja" wykrywa VRAM i dobiera najlepszy dostępny model dla każdej kategorii. Jeśli preferowany model nie ma pobranych wag, system wybiera najlepszy zainstalowany fallback.

**Badge "AKTYWNY · BRAK WAG"**
Pojawia się gdy model jest ustawiony jako aktywny w konfiguracji, ale wagi nie zostały jeszcze pobrane. Kliknij Auto-konfigurację aby naprawić.
    `.trim(),
  },
  {
    id: 'qa',
    icon: '🔍',
    titleKey: 'help_qa_title',
    content: `
**Co to robi?**
Analizuje jakość pliku audio pod kątem typowych problemów produkcyjnych i opcjonalnie naprawia je automatycznie.

**Sprawdzane parametry**
- **Klipping** — przekroczenie 0 dBFS (zniekształcenia)
- **Cisza** — zbyt długie fragmenty ciszy lub przekroczony próg silence ratio
- **Szum tła** — poziom szumu w pauzach między słowami
- **Prędkość mowy** — słów na minutę (norma: 130–180 WPM)
- **Głośność** — poziom LUFS (norma EBU R128: −23 LUFS, ACX: −18 LUFS)

**Automatyczna naprawa**
Normalizacja loudnorm, usuwanie nadmiernej ciszy — wynik zapisywany jako nowy plik.
    `.trim(),
  },
];

export default function HelpPage() {
  const { t } = useT();
  const [active, setActive] = useState('lektor');
  const section = SECTIONS_PL.find(s => s.id === active);

  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: i > 0 ? 16 : 0, marginBottom: 4 }}>{line.slice(2, -2)}</div>;
      }
      if (line.startsWith('- ')) {
        const parts = line.slice(2).split(/\*([^*]+)\*/g);
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 8 }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {parts.map((p, j) => j % 2 === 1 ? <em key={j} style={{ color: 'var(--text-primary)', fontStyle: 'normal', fontWeight: 600 }}>{p}</em> : p)}
            </span>
          </div>
        );
      }
      if (line.match(/^\d+\. /)) {
        return <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4, paddingLeft: 8 }}>{line}</div>;
      }
      if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      return (
        <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4, lineHeight: 1.6 }}>
          {parts.map((p, j) => j % 2 === 1
            ? <strong key={j} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p}</strong>
            : p.split(/`([^`]+)`/g).map((q, k) => k % 2 === 1
              ? <code key={k} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{q}</code>
              : q)
          )}
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>{t('help_title')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SECTIONS_PL.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: active === s.id ? 'var(--accent)' : 'transparent',
                color: active === s.id ? '#fff' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: active === s.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span>{s.icon}</span>
              <span>{t(s.titleKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: 12, padding: '20px 24px', overflow: 'auto' }}>
        {section && (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{section.icon}</span>
              {t(section.titleKey)}
            </div>
            <div>{renderContent(section.content)}</div>
          </>
        )}
      </div>
    </div>
  );
}
