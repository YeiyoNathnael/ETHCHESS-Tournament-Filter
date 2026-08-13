<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content animate-modal">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <div class="header-icon-badge">
              <Trophy :size="20" />
            </div>
            <div>
              <h2 class="modal-title">Create New Tournament</h2>
              <p class="modal-subtitle">Configure event details and player qualification rules</p>
            </div>
          </div>
          <button class="close-btn" @click="closeModal">
            <X :size="20" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-form">
          <!-- Step 1: Basic Event Information -->
          <div class="form-section">
            <h3 class="section-heading">
              <Sparkles :size="16" />
              Event Details
            </h3>

            <div class="form-group">
              <label class="form-label">Tournament Title *</label>
              <input
                v-model="form.title"
                type="text"
                class="form-input"
                placeholder="e.g. ETHCHESS Under 1500 Rapid Championship"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea
                v-model="form.description"
                class="form-textarea"
                rows="3"
                placeholder="Describe the tournament rules, prize structure, and schedule..."
              ></textarea>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Date & Time *</label>
                <input
                  v-model="form.date"
                  type="datetime-local"
                  class="form-input"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Time Control Format *</label>
                <div class="format-selector">
                  <button
                    type="button"
                    class="format-btn"
                    :class="{ active: form.timeControl === 'Rapid' }"
                    @click="form.timeControl = 'Rapid'"
                  >
                    <Clock :size="14" /> Rapid
                  </button>
                  <button
                    type="button"
                    class="format-btn"
                    :class="{ active: form.timeControl === 'Blitz' }"
                    @click="form.timeControl = 'Blitz'"
                  >
                    <Zap :size="14" /> Blitz
                  </button>
                  <button
                    type="button"
                    class="format-btn"
                    :class="{ active: form.timeControl === 'Bullet' }"
                    @click="form.timeControl = 'Bullet'"
                  >
                    <Flame :size="14" /> Bullet
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Location / Online Arena URL *</label>
              <input
                v-model="form.location"
                type="text"
                class="form-input"
                placeholder="e.g. ETHCHESS HQ & Lichess Arena URL"
                required
              />
            </div>

            <!-- Cover Image Upload -->
            <div class="form-group">
              <label class="form-label">Cover Image</label>

              <!-- Upload Zone -->
              <div
                class="image-upload-zone"
                :class="{ dragging: isDraggingImage, 'has-image': form.coverImage }"
                @dragover.prevent="isDraggingImage = true"
                @dragleave.prevent="isDraggingImage = false"
                @drop.prevent="handleImageDrop"
                @click="() => (imageInputRef as HTMLInputElement)?.click()"
              >
                <input
                  ref="imageInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden-file-input"
                  @change="handleImageFileSelect"
                />
                <div v-if="isUploadingImage" class="upload-state uploading">
                  <div class="upload-spinner"></div>
                  <span>Uploading image...</span>
                </div>
                <template v-else-if="form.coverImage">
                  <img :src="form.coverImage" class="upload-preview" alt="Cover preview" />
                  <div class="upload-overlay-change">
                    <UploadCloud :size="20" />
                    <span>Click or drop to change</span>
                  </div>
                </template>
                <div v-else class="upload-state empty">
                  <UploadCloud :size="32" class="upload-icon" />
                  <div class="upload-hint-title">Drop image here or click to upload</div>
                  <div class="upload-hint-sub">PNG, JPG, WEBP — max 5MB</div>
                </div>
              </div>

              <!-- Preset Themes -->
              <div class="preset-label">Or choose a preset theme:</div>
              <div class="preset-images">
                <button
                  v-for="(preset, idx) in imagePresets"
                  :key="idx"
                  type="button"
                  class="preset-thumb"
                  :class="{ active: form.coverImage === preset.url }"
                  @click="form.coverImage = preset.url"
                >
                  <img :src="preset.url" :alt="preset.name" />
                  <span class="preset-name">{{ preset.name }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Qualification Rules Setup -->
          <div class="form-section rules-section">
            <div class="rules-section-header">
              <div>
                <h3 class="section-heading">
                  <ShieldCheck :size="16" />
                  Platform Qualification Rules
                </h3>
                <p class="section-subtext">Configure independent limits for Chess.com and Lichess candidates.</p>
              </div>

              <!-- Platform Switcher Tabs -->
              <div class="platform-tabs">
                <button
                  type="button"
                  class="platform-tab-btn"
                  :class="{ active: ruleTab === 'chessCom' }"
                  @click="ruleTab = 'chessCom'"
                >
                  <span>♟ Chess.com</span>
                </button>
                <button
                  type="button"
                  class="platform-tab-btn"
                  :class="{ active: ruleTab === 'lichess' }"
                  @click="ruleTab = 'lichess'"
                >
                  <span>♞ Lichess</span>
                </button>
              </div>
            </div>

            <!-- Chess.com Rule Setup -->
            <div v-if="ruleTab === 'chessCom'" class="rules-grid">
              <div class="form-group">
                <label class="form-label">Chess.com Max Active Rating *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.chessCom.maxRating"
                    type="number"
                    class="form-input"
                    min="100"
                    max="3500"
                    required
                  />
                  <span class="input-suffix">ELO</span>
                </div>
                <span class="field-hint">e.g. 1500 max limit for Chess.com</span>
              </div>

              <div class="form-group">
                <label class="form-label">Chess.com Max Peak Rating *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.chessCom.maxPeakRating"
                    type="number"
                    class="form-input"
                    min="100"
                    max="3500"
                    required
                  />
                  <span class="input-suffix">ELO</span>
                </div>
                <span class="field-hint">Filters historical high peaks</span>
              </div>

              <div class="form-group">
                <label class="form-label">Chess.com Min Games Played *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.chessCom.minGamesPlayed"
                    type="number"
                    class="form-input"
                    min="0"
                    max="5000"
                    required
                  />
                  <span class="input-suffix">Games</span>
                </div>
                <span class="field-hint">Ensures rating stability</span>
              </div>

              <div class="form-group">
                <label class="form-label">Chess.com Min Account Age *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.chessCom.minAccountAgeDays"
                    type="number"
                    class="form-input"
                    min="0"
                    max="1000"
                    required
                  />
                  <span class="input-suffix">Days</span>
                </div>
                <span class="field-hint">Filters brand-new accounts</span>
              </div>
            </div>

            <!-- Lichess Rule Setup -->
            <div v-else class="rules-grid">
              <div class="form-group">
                <label class="form-label">Lichess Max Active Rating *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.lichess.maxRating"
                    type="number"
                    class="form-input"
                    min="100"
                    max="3500"
                    required
                  />
                  <span class="input-suffix">ELO</span>
                </div>
                <span class="field-hint">e.g. 1650 max limit for Lichess rating system</span>
              </div>

              <div class="form-group">
                <label class="form-label">Lichess Max Peak *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.lichess.maxPeakRating"
                    type="number"
                    class="form-input"
                    min="100"
                    max="3500"
                    required
                  />
                  <span class="input-suffix">ELO</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Lichess Min Games Played *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.lichess.minGamesPlayed"
                    type="number"
                    class="form-input"
                    min="0"
                    max="5000"
                    required
                  />
                  <span class="input-suffix">Games</span>
                </div>
                <span class="field-hint">Ensures Lichess rating stability</span>
              </div>

              <div class="form-group">
                <label class="form-label">Lichess Min Account Age *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="form.rules.lichess.minAccountAgeDays"
                    type="number"
                    class="form-input"
                    min="0"
                    max="1000"
                    required
                  />
                  <span class="input-suffix">Days</span>
                </div>
                <span class="field-hint">Filters throwaway Lichess accounts</span>
              </div>
            </div>

            <!-- Global Minimum Trust Score Threshold Setup -->
            <div class="trust-threshold-setup-box margin-top-sm">
              <div class="tweak-header">
                <label class="form-label flex-label">
                  <Gauge :size="16" class="icon-jade" />
                  <span>Minimum Trust Score Threshold *</span>
                </label>
                <span class="threshold-val-badge">≥ {{ form.rules.minimumTrustScore }} / 100</span>
              </div>
              <input
                v-model.number="form.rules.minimumTrustScore"
                type="range"
                min="0"
                max="100"
                step="5"
                class="form-range-slider"
              />
              <span class="field-hint">
                Candidates with rating ceiling or activity limit exceedances whose statistical Trust Score is ≥ {{ form.rules.minimumTrustScore }} will be rescued to ELIGIBLE.
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary btn-submit">
              <Plus :size="18" />
              <span>Create Tournament Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { TimeControl, QualificationRules } from '~/types/tournament';
import { useTournaments } from '~/composables/useTournaments';
import { useToast } from '~/composables/useToast';
import { Trophy, X, Sparkles, Clock, Zap, Flame, ShieldCheck, Plus, UploadCloud } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', id: string): void;
}>();

const { createTournament } = useTournaments();
const { addToast } = useToast();

const ruleTab = ref<'chessCom' | 'lichess'>('chessCom');
const isDraggingImage = ref(false);
const isUploadingImage = ref(false);
const imageInputRef = ref<HTMLInputElement | null>(null);

async function handleImageUpload(file: File) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) {
    addToast('File too large', 'Please upload an image under 5MB.', 'error');
    return;
  }
  isUploadingImage.value = true;
  try {
    const fd = new FormData();
    fd.append('image', file, file.name);
    const res = await $fetch<{ url: string }>('/api/upload-image', { method: 'POST', body: fd });
    form.coverImage = res.url;
  } catch {
    addToast('Upload failed', 'Could not upload image. Please try again.', 'error');
  } finally {
    isUploadingImage.value = false;
    isDraggingImage.value = false;
  }
}

function handleImageDrop(e: DragEvent) {
  isDraggingImage.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleImageUpload(file);
}

function handleImageFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleImageUpload(file);
}

const imagePresets = [
  {
    name: 'Jade Chessboard',
    url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1000&auto=format&fit=crop',
  },
  {
    name: 'Wooden Knights',
    url: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=1000&auto=format&fit=crop',
  },
  {
    name: 'Classic Pieces',
    url: 'https://images.unsplash.com/photo-1560174038-da43ac74f01b?q=80&w=1000&auto=format&fit=crop',
  },
];

const form = reactive({
  title: '',
  description: '',
  date: '2026-08-30T15:00',
  location: 'ETHCHESS Club HQ & Online Arena',
  coverImage: imagePresets[0].url,
  timeControl: 'Rapid' as TimeControl,
  rules: {
    minimumTrustScore: 65,
    chessCom: {
      maxRating: 1500,
      maxPeakRating: 1600,
      minGamesPlayed: 30,
      minAccountAgeDays: 90,
    },
    lichess: {
      maxRating: 1500,
      maxPeakRating: 1600,
      minGamesPlayed: 30,
      minAccountAgeDays: 90,
    },
    chessComMaxRating: 1500,
    chessComMaxPeak: 1600,
    chessComMinGames: 30,
    chessComMinAgeMonths: 3,
    lichessMaxRating: 1500,
    lichessMaxPeak: 1600,
    lichessMinGames: 30,
    lichessMinAgeMonths: 3,
  } as any,
});

function closeModal() {
  emit('close');
}

async function handleSubmit() {
  if (!form.title.trim()) return;

  const finalRules: QualificationRules = {
    minimumTrustScore: form.rules.minimumTrustScore || 65,
    chessCom: { ...form.rules.chessCom },
    lichess: { ...form.rules.lichess },
    chessComMaxRating: form.rules.chessCom.maxRating,
    chessComMaxPeak: form.rules.chessCom.maxPeakRating,
    chessComMinGames: form.rules.chessCom.minGamesPlayed,
    chessComMinAgeMonths: Math.round(form.rules.chessCom.minAccountAgeDays / 30.4375) || 3,
    lichessMaxRating: form.rules.lichess.maxRating,
    lichessMaxPeak: form.rules.lichess.maxPeakRating,
    lichessMinGames: form.rules.lichess.minGamesPlayed,
    lichessMinAgeMonths: Math.round(form.rules.lichess.minAccountAgeDays / 30.4375) || 3,
  };

  const tourney = await createTournament({
    title: form.title,
    description: form.description,
    date: form.date,
    location: form.location,
    coverImage: form.coverImage,
    timeControl: form.timeControl,
    rules: finalRules,
    status: 'UPCOMING',
  });

  addToast('Tournament Created!', `"${tourney.title}" has been successfully added to your dashboard.`, 'success');
  emit('created', tourney.id);
  closeModal();

  // Reset form
  form.title = '';
  form.description = '';
}
</script>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-cream-border);
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.header-icon-badge {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: var(--color-jade-deep);
  color: var(--color-cream-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-jade-deep);
  line-height: 1.2;
}

.modal-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}

.form-section {
  background: var(--color-cream-bg);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  border: 1px solid var(--color-cream-border);
}

.rules-section {
  background: var(--color-jade-light);
  border-color: var(--color-jade-border);
}

.rules-section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.platform-tabs {
  display: flex;
  gap: 0.35rem;
  background: white;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-jade-border);
}

.platform-tab-btn {
  padding: 0.35rem 0.75rem;
  font-family: var(--font-family-base);
  font-size: 0.8rem;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.platform-tab-btn.active {
  background: var(--color-jade-deep);
  color: white;
}

.section-heading {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-jade-deep);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.section-subtext {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-cream-border);
  background: white;
  font-family: var(--font-family-base);
  font-size: 0.9rem;
  color: var(--color-text-main);
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-jade-bright);
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.15);
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.format-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.format-btn {
  padding: 0.6rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-cream-border);
  background: white;
  font-family: var(--font-family-base);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: var(--color-text-muted);
  transition: all 0.2s ease;
}

.format-btn.active {
  background: var(--color-jade-deep);
  color: white;
  border-color: var(--color-jade-deep);
}

.preset-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-top: 0.35rem;
}

.preset-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.preset-thumb {
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  background: white;
  padding: 0;
  position: relative;
  height: 54px;
}

.preset-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-thumb.active {
  border-color: var(--color-terracotta);
  box-shadow: 0 0 0 2px var(--color-terracotta);
}

.preset-name {
  position: absolute;
  bottom: 0;
  inset-x: 0;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.25rem;
  text-align: center;
}

.rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-suffix .form-input {
  padding-right: 3.5rem;
}

.input-suffix {
  position: absolute;
  right: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.field-hint {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.animate-modal {
  animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* ── Image Upload Zone ── */
.hidden-file-input {
  display: none;
}

.image-upload-zone {
  position: relative;
  width: 100%;
  height: 180px;
  border: 2px dashed var(--color-cream-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s;
  background: var(--color-cream-alt, #f4f0eb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-upload-zone:hover,
.image-upload-zone.dragging {
  border-color: var(--color-jade-deep);
  background: color-mix(in srgb, var(--color-jade-deep) 6%, transparent);
}

.image-upload-zone.has-image {
  border-style: solid;
  border-color: var(--color-jade-deep);
}

.upload-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
}

.upload-overlay-change {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 0.85rem;
  font-weight: 600;
}

.image-upload-zone:hover .upload-overlay-change {
  opacity: 1;
}

.upload-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  padding: 1rem;
}

.upload-state.empty .upload-icon {
  color: var(--color-jade-deep);
  opacity: 0.6;
}

.upload-hint-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-main, #1a1a1a);
}

.upload-hint-sub {
  font-size: 0.78rem;
  color: var(--color-text-muted, #888);
}

.upload-state.uploading {
  gap: 0.75rem;
  color: var(--color-jade-deep);
  font-weight: 600;
  font-size: 0.9rem;
}

.upload-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid color-mix(in srgb, var(--color-jade-deep) 20%, transparent);
  border-top-color: var(--color-jade-deep);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
