<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-card upset-modal-card">
      <div class="modal-header">
        <div class="header-title-wrap">
          <div class="trophy-icon-badge">
            <Trophy :size="20" />
          </div>
          <div>
            <h2 class="modal-title">Find Biggest Tournament Upsets</h2>
            <p class="modal-subtitle">Upload tournament PGN to calculate giant-killer wins based on Blitz ratings</p>
          </div>
        </div>
        <button class="btn-close" title="Close modal" @click="closeModal">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Input Mode: Upload or Paste PGN -->
        <div class="input-section">
          <div class="pgn-dropzone" :class="{ dragging: isDragging }" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
            <input ref="fileInputRef" type="file" accept=".pgn,.txt" class="hidden-file-input" @change="handleFileSelect" />
            
            <div class="dropzone-content">
              <UploadCloud :size="32" class="icon-jade" />
              <div class="dropzone-text">
                <span class="dropzone-main">Drag & Drop PGN File here, or <button class="link-btn" @click="triggerFileInput">browse file</button></span>
                <span class="dropzone-sub">Supports single or multi-game tournament .pgn files</span>
              </div>
            </div>
          </div>

          <div class="or-divider">
            <span>OR PASTE PGN TEXT</span>
          </div>

          <div class="textarea-wrap">
            <textarea
              v-model="pgnTextInput"
              class="pgn-textarea"
              placeholder='[Event "ETHCHESS Tournament"]&#10;[White "Ooshiii"]&#10;[Black "Trigan_defense"]&#10;[Result "1-0"]...'
              rows="4"
            ></textarea>
          </div>

          <div class="actions-bar">
            <button
              class="btn btn-primary btn-analyze"
              :disabled="!pgnTextInput.trim() || isAnalyzing"
              @click="runAnalysis"
            >
              <Sparkles v-if="!isAnalyzing" :size="16" />
              <Loader2 v-else :size="16" class="animate-spin" />
              <span>{{ isAnalyzing ? 'Analyzing PGN Games...' : 'Calculate Biggest Upsets' }}</span>
            </button>
            <button v-if="pgnTextInput" class="btn btn-ghost btn-sm" @click="clearInput">
              Clear Input
            </button>
          </div>
        </div>

        <!-- Results Display Section -->
        <div v-if="analysisResult" class="results-section">
          <!-- Summary Bar -->
          <div class="analysis-summary-bar">
            <div class="summary-chip">
              <Gamepad2 :size="15" class="icon-jade" />
              <span><strong>{{ analysisResult.totalGamesParsed }}</strong> Games Parsed</span>
            </div>
            <div class="summary-chip">
              <Swords :size="15" class="icon-jade" />
              <span><strong>{{ analysisResult.decisiveGamesCount }}</strong> Decisive Results</span>
            </div>
            <div class="summary-chip">
              <Users :size="15" class="icon-jade" />
              <span><strong>{{ analysisResult.matchedPlayersCount }}</strong> Players Matched</span>
            </div>
          </div>

          <!-- Platform Tabs -->
          <div class="tabs-header">
            <button
              class="tab-btn lichess-tab"
              :class="{ active: activeTab === 'lichess' }"
              @click="activeTab = 'lichess'"
            >
              <IconLichess :size="16" />
              <span>Lichess Blitz Upsets ({{ analysisResult.lichessUpsets.length }})</span>
            </button>

            <button
              class="tab-btn cdc-tab"
              :class="{ active: activeTab === 'chessCom' }"
              @click="activeTab = 'chessCom'"
            >
              <IconChessCom :size="16" />
              <span>Chess.com / CDC Blitz Upsets ({{ analysisResult.chessComUpsets.length }})</span>
            </button>
          </div>

          <!-- Active Upset List View -->
          <div class="upset-list-container">
            <div v-if="currentUpsetList.length === 0" class="empty-upsets">
              <ShieldAlert :size="32" class="text-terracotta" />
              <p>No lower-rated player upsets were found in the uploaded PGN for {{ activeTab === 'lichess' ? 'Lichess' : 'Chess.com' }} Blitz ratings.</p>
            </div>

            <div v-else class="upset-cards-list">
              <div v-for="item in currentUpsetList" :key="item.id" class="upset-card">
                <div class="upset-card-header">
                  <div class="rank-pill" :class="{ top1: item.rank === 1, top2: item.rank === 2, top3: item.rank === 3 }">
                    <Trophy v-if="item.rank === 1" :size="12" />
                    <span>#{{ item.rank }}</span>
                  </div>

                  <div class="upset-diff-badge">
                    <TrendingUp :size="14" />
                    <span>+{{ item.ratingDiff }} Blitz ELO Upset!</span>
                  </div>

                  <button
                    class="btn-toggle-game"
                    :title="expandedGameId === item.id ? 'Hide game details' : 'View PGN game details'"
                    @click="toggleGameDetails(item.id)"
                  >
                    <span>{{ expandedGameId === item.id ? 'Hide Moves' : 'View Game' }}</span>
                    <ChevronDown :size="14" :class="{ 'rotate-180': expandedGameId === item.id }" />
                  </button>
                </div>

                <div class="upset-players-grid">
                  <!-- Winner Column -->
                  <div class="player-col winner-col">
                    <div class="col-label">
                      <Zap :size="13" class="text-jade" />
                      <span>WINNER (Giant Killer)</span>
                    </div>
                    <div class="player-details">
                      <div class="player-name">{{ item.winnerHandle }}</div>
                      <div v-if="item.winnerMatchedParticipant?.telegramHandle" class="player-tg">
                        {{ item.winnerMatchedParticipant.telegramHandle }}
                      </div>
                      <div class="player-rating-chip winner-chip">
                        <span v-if="item.winnerRating">{{ item.winnerRating }} Blitz ELO</span>
                        <span v-else class="text-missing">No {{ activeTab === 'lichess' ? 'Lichess' : 'CDC' }} Account*</span>
                      </div>
                    </div>
                  </div>

                  <div class="vs-divider">
                    <span>VS</span>
                  </div>

                  <!-- Loser Column -->
                  <div class="player-col loser-col">
                    <div class="col-label">
                      <ShieldOff :size="13" class="text-terracotta" />
                      <span>HIGHER RATED PLAYER</span>
                    </div>
                    <div class="player-details">
                      <div class="player-name">{{ item.loserHandle }}</div>
                      <div v-if="item.loserMatchedParticipant?.telegramHandle" class="player-tg">
                        {{ item.loserMatchedParticipant.telegramHandle }}
                      </div>
                      <div class="player-rating-chip loser-chip">
                        <span v-if="item.loserRating">{{ item.loserRating }} Blitz ELO</span>
                        <span v-else class="text-missing">No {{ activeTab === 'lichess' ? 'Lichess' : 'CDC' }} Account*</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Expandable Game PGN Box -->
                <div v-if="expandedGameId === item.id" class="game-details-box">
                  <div class="game-meta-header">
                    <span>Round {{ item.game.round || '1' }} • {{ item.game.date || 'Date TBD' }}</span>
                    <button class="btn-copy-pgn" @click="copyGamePgn(item)">
                      <Copy :size="12" />
                      <span>Copy PGN</span>
                    </button>
                  </div>
                  <pre class="pgn-moves-pre">{{ item.game.movesText || '1. e4 e5 ...' }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Participant } from '~/types/tournament';
import { parsePgnText, analyzeTournamentUpsets, type UpsetAnalysisResult, type UpsetEntry } from '~/utils/pgnParser';
import { useToast } from '~/composables/useToast';
import IconChessCom from '~/components/icons/IconChessCom.vue';
import IconLichess from '~/components/icons/IconLichess.vue';
import {
  Trophy,
  X,
  UploadCloud,
  Sparkles,
  Loader2,
  Gamepad2,
  Swords,
  Users,
  TrendingUp,
  ChevronDown,
  Zap,
  ShieldOff,
  Copy,
  ShieldAlert,
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  participants: Participant[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { addToast } = useToast();

const fileInputRef = ref<HTMLInputElement | null>(null);
const pgnTextInput = ref('');
const isDragging = ref(false);
const isAnalyzing = ref(false);
const analysisResult = ref<UpsetAnalysisResult | null>(null);
const activeTab = ref<'lichess' | 'chessCom'>('lichess');
const expandedGameId = ref<string | null>(null);

const currentUpsetList = computed<UpsetEntry[]>(() => {
  if (!analysisResult.value) return [];
  return activeTab.value === 'lichess' ? analysisResult.value.lichessUpsets : analysisResult.value.chessComUpsets;
});

function closeModal() {
  emit('close');
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    readFile(target.files[0]);
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    readFile(e.dataTransfer.files[0]);
  }
}

function readFile(file: File) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target?.result as string;
    if (text) {
      pgnTextInput.value = text;
      runAnalysis();
    }
  };
  reader.readAsText(file);
}

function clearInput() {
  pgnTextInput.value = '';
  analysisResult.value = null;
}

function runAnalysis() {
  if (!pgnTextInput.value.trim()) return;

  isAnalyzing.value = true;
  try {
    const games = parsePgnText(pgnTextInput.value);
    const result = analyzeTournamentUpsets(games, props.participants);
    analysisResult.value = result;

    if (result.lichessUpsets.length === 0 && result.chessComUpsets.length > 0) {
      activeTab.value = 'chessCom';
    } else {
      activeTab.value = 'lichess';
    }

    addToast({
      type: 'success',
      title: 'Analysis Complete!',
      message: `Parsed ${result.totalGamesParsed} games. Found ${result.lichessUpsets.length} Lichess upsets & ${result.chessComUpsets.length} Chess.com upsets.`,
    });
  } catch (err) {
    console.error('Error analyzing PGN:', err);
    addToast({
      type: 'error',
      title: 'Analysis Error',
      message: 'Failed to parse PGN file. Please check file format.',
    });
  } finally {
    isAnalyzing.value = false;
  }
}

function toggleGameDetails(id: string) {
  expandedGameId.value = expandedGameId.value === id ? null : id;
}

function copyGamePgn(item: UpsetEntry) {
  const pgnHeaderString = Object.entries(item.game.headers)
    .map(([k, v]) => `[${k} "${v}"]`)
    .join('\n');
  const fullText = `${pgnHeaderString}\n\n${item.game.movesText}`;

  navigator.clipboard.writeText(fullText);
  addToast({
    type: 'success',
    title: 'Copied to Clipboard!',
    message: `Copied game PGN (${item.winnerHandle} vs ${item.loserHandle})`,
  });
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 82, 87, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.upset-modal-card {
  background: #ffffff;
  border-radius: 16px;
  max-width: 760px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(15, 82, 87, 0.15);
  overflow: hidden;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(15, 82, 87, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #faf7f2;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.trophy-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--color-jade-deep, #0f5257);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-jade-deep, #0f5257);
  margin: 0;
}

.modal-subtitle {
  font-size: 0.82rem;
  color: #666;
  margin: 2px 0 0 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: #888;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pgn-dropzone {
  border: 2px dashed rgba(15, 82, 87, 0.25);
  border-radius: 12px;
  padding: 1.5rem;
  background: #faf7f2;
  text-align: center;
  transition: all 0.2s ease;
}

.pgn-dropzone.dragging {
  border-color: var(--color-jade-primary, #00a86b);
  background: rgba(0, 168, 107, 0.05);
}

.hidden-file-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.dropzone-main {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #333;
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-jade-primary, #00a86b);
  text-decoration: underline;
  cursor: pointer;
  font-weight: 700;
}

.dropzone-sub {
  display: block;
  font-size: 0.78rem;
  color: #777;
  margin-top: 2px;
}

.or-divider {
  text-align: center;
  margin: 1rem 0;
  position: relative;
}

.or-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(15, 82, 87, 0.1);
  z-index: 1;
}

.or-divider span {
  position: relative;
  z-index: 2;
  background: #ffffff;
  padding: 0 0.8rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #888;
  letter-spacing: 0.05em;
}

.pgn-textarea {
  width: 100%;
  border: 1px solid rgba(15, 82, 87, 0.2);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-family: monospace;
  font-size: 0.82rem;
  color: #333;
  background: #faf7f2;
  resize: vertical;
}

.pgn-textarea:focus {
  outline: none;
  border-color: var(--color-jade-primary, #00a86b);
}

.actions-bar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1rem;
}

.btn-analyze {
  flex: 1;
  background: var(--color-jade-deep, #0f5257);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-analyze:hover:not(:disabled) {
  background: var(--color-jade-primary, #00a86b);
}

.btn-analyze:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: #666;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-ghost:hover {
  background: #f0f0f0;
}

.analysis-summary-bar {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  padding: 0.8rem 1rem;
  background: #faf7f2;
  border-radius: 10px;
  border: 1px solid rgba(15, 82, 87, 0.1);

}

.summary-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: #444;
}

.tabs-header {
  display: flex;
  gap: 0.6rem;
  margin-top: 1rem;
  border-bottom: 2px solid rgba(15, 82, 87, 0.1);
  padding-bottom: 0.5rem;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.5rem 1rem;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  color: #666;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: var(--color-jade-deep, #0f5257);
  color: #ffffff;
}

.empty-upsets {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #777;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9rem;
}

.upset-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
}

.upset-card {
  border: 1px solid rgba(15, 82, 87, 0.15);
  border-radius: 12px;
  padding: 1rem;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.upset-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.rank-pill {
  background: #eee;
  color: #444;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.rank-pill.top1 {
  background: #ffd700;
  color: #000;
}

.rank-pill.top2 {
  background: #c0c0c0;
  color: #000;
}

.rank-pill.top3 {
  background: #cd7f32;
  color: #fff;
}

.upset-diff-badge {
  background: rgba(0, 168, 107, 0.15);
  color: var(--color-jade-primary, #00a86b);
  font-weight: 800;
  font-size: 0.82rem;
  padding: 4px 10px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-toggle-game {
  background: transparent;
  border: none;
  color: #666;
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.btn-toggle-game:hover {
  color: var(--color-jade-deep, #0f5257);
}

.upset-players-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
}

.player-col {
  background: #faf7f2;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(15, 82, 87, 0.08);
}

.col-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  color: #777;
  letter-spacing: 0.03em;
  margin-bottom: 0.4rem;
}

.player-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #222;
}

.player-tg {
  font-size: 0.78rem;
  color: var(--color-jade-primary, #00a86b);
  font-weight: 600;
}

.player-rating-chip {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  margin-top: 0.4rem;
}

.winner-chip {
  background: rgba(0, 168, 107, 0.15);
  color: var(--color-jade-primary, #00a86b);
}

.loser-chip {
  background: rgba(217, 107, 67, 0.15);
  color: var(--color-terracotta, #d96b43);
}

.vs-divider {
  font-size: 0.75rem;
  font-weight: 800;
  color: #aaa;
}

.game-details-box {
  margin-top: 1rem;
  background: #f4f1ea;
  border-radius: 8px;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.game-meta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.btn-copy-pgn {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.btn-copy-pgn:hover {
  background: #f0f0f0;
}

.pgn-moves-pre {
  font-family: monospace;
  font-size: 0.78rem;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.icon-jade {
  color: var(--color-jade-primary, #00a86b);
}

.text-jade {
  color: var(--color-jade-primary, #00a86b);
}

.text-terracotta {
  color: var(--color-terracotta, #d96b43);
}

.rotate-180 {
  transform: rotate(180deg);
}

@media (max-width: 600px) {
  .upset-players-grid {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .vs-divider {
    text-align: center;
  }
}
</style>
