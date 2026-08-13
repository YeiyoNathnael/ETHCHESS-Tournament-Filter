<template>
  <div class="csv-uploader card">
    <div class="card-header flex-between">
      <div>
        <h3 class="card-title">
          <FileSpreadsheet :size="20" />
          Participant Intake & CSV Verification
        </h3>
        <p class="card-subtitle">
          Upload registration responses or load default ETHCHESS form submission CSV to evaluate eligibility.
        </p>
      </div>

      <button
        class="btn btn-secondary btn-default-csv"
        :disabled="isProcessing || isVerifying"
        @click="handleLoadDefaultCsv"
      >
        <Sparkles :size="16" />
        <span>Load Default Form Responses (ETHCHESS U1500)</span>
      </button>
    </div>

    <!-- Drag & Drop Zone -->
    <div
      class="dropzone"
      :class="{ dragging: isDragging, processing: isProcessing || isVerifying }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleFileDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv"
        class="hidden-file-input"
        @change="handleFileSelect"
      />

      <div v-if="!isProcessing && !isVerifying" class="dropzone-content">
        <div class="dropzone-icon-wrap">
          <UploadCloud :size="32" />
        </div>
        <div class="dropzone-text">
          <p class="primary-text">
            <strong>Click to upload</strong> or drag and drop your CSV response file
          </p>
          <p class="secondary-text">
            Supports Google Forms CSV export format (Timestamp, Telegram, Chess.com, Lichess ELOs)
          </p>
        </div>
      </div>

      <!-- Verification Progress Bar -->
      <div v-else class="progress-wrap">
        <div class="spinner-wrap">
          <Loader2 class="spin-icon" :size="28" />
        </div>
        <div class="progress-text">
          <p class="progress-title">Processing & Verifying Live Ratings...</p>
          <p class="progress-stats">
            <span v-if="progressTotal > 0">Inspecting public API for {{ progressCompleted }} / {{ progressTotal }} participants ({{ progressPercent }}%)</span>
            <span v-else>Querying Chess.com & Lichess public APIs and calculating Trust Scores...</span>
          </p>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: progressTotal > 0 ? `${progressPercent}%` : '100%' }"></div>
        </div>
      </div>
    </div>

    <div v-if="filenameLoaded" class="file-loaded-banner">
      <CheckCircle2 :size="16" class="success-icon" />
      <span>Successfully parsed & evaluated dataset: <strong>{{ filenameLoaded }}</strong></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTournaments } from '~/composables/useTournaments';
import { useToast } from '~/composables/useToast';
import { parseCsvContent } from '~/utils/csvParser';
import { FileSpreadsheet, Sparkles, UploadCloud, Loader2, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps<{
  tournamentId: string;
}>();

const emit = defineEmits<{
  (e: 'parsed', count: number): void;
}>();

const { getTournament, setParticipants, loadDefaultCsvData, processCsvFile, verifyAllParticipants } = useTournaments();
const { addToast } = useToast();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isProcessing = ref(false);
const isVerifying = ref(false);
const progressCompleted = ref(0);
const progressTotal = ref(0);
const filenameLoaded = ref('');

const progressPercent = computed(() => {
  if (progressTotal.value === 0) return 0;
  return Math.min(100, Math.round((progressCompleted.value / progressTotal.value) * 100));
});

function triggerFileInput() {
  if (isProcessing.value || isVerifying.value) return;
  fileInputRef.value?.click();
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    processFile(target.files[0]);
  }
}

function handleFileDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    processFile(e.dataTransfer.files[0]);
  }
}

async function processFile(file: File) {
  if (!file.name.endsWith('.csv')) {
    addToast('Invalid File', 'Please select a valid CSV file.', 'error');
    return;
  }

  isProcessing.value = true;
  filenameLoaded.value = file.name;

  try {
    const text = await file.text();
    const tourney = getTournament(props.tournamentId);
    if (!tourney) return;

    addToast('Processing & Verifying', `Processing CSV, querying Chess.com & Lichess APIs, and saving entries...`, 'info');

    // Server-side processing & DB ingestion (locks UI until finished)
    const serverMapped = await processCsvFile(props.tournamentId, text);
    if (serverMapped && serverMapped.length > 0) {
      emit('parsed', serverMapped.length);
      addToast('Sync Complete', `Successfully processed & verified ${serverMapped.length} entries from ${file.name}.`, 'success');
      return;
    }

    // Client fallback if server route returns empty:
    const parsed = parseCsvContent(text, props.tournamentId, tourney.rules, tourney.timeControl);
    setParticipants(props.tournamentId, parsed);
    emit('parsed', parsed.length);

    if (parsed.length > 0) {
      isProcessing.value = false;
      isVerifying.value = true;
      progressTotal.value = parsed.length;
      progressCompleted.value = 0;

      await verifyAllParticipants(props.tournamentId, (completed, total) => {
        progressCompleted.value = completed;
        progressTotal.value = total;
      });
    }

    addToast('Verification Complete', 'Live ratings and Trust Scores verified.', 'info');
  } catch (err: any) {
    addToast('Parsing Error', err?.message || 'Failed to read CSV file.', 'error');
  } finally {
    isProcessing.value = false;
    isVerifying.value = false;
  }
}

async function handleLoadDefaultCsv() {
  isProcessing.value = true;
  filenameLoaded.value = 'ETHCHESS_Club_Under_1500_Tournament_Responses_Form_Responses_1.csv';

  try {
    let csvText = '';
    try {
      const res = await fetch('/ETHCHESS_Club_Under_1500_Tournament_Responses_Form_Responses_1.csv');
      if (res.ok) {
        csvText = await res.text();
      }
    } catch {
      // Fallback
    }

    addToast(
      'Processing Default CSV',
      `Parsing default form responses, querying platform APIs, and evaluating Trust Scores...`,
      'info'
    );

    // Server-side processing & DB ingestion (locks UI until finished)
    const serverMapped = await processCsvFile(props.tournamentId, csvText || undefined as any);
    if (serverMapped && serverMapped.length > 0) {
      emit('parsed', serverMapped.length);
      addToast('Default CSV Loaded', `Loaded & verified ${serverMapped.length} form submissions.`, 'success');
      return;
    }

    // Fallback client load:
    const parsed = loadDefaultCsvData(props.tournamentId, csvText || undefined);
    emit('parsed', parsed.length);

    if (parsed.length > 0) {
      isProcessing.value = false;
      isVerifying.value = true;
      progressTotal.value = parsed.length;
      progressCompleted.value = 0;

      await verifyAllParticipants(props.tournamentId, (completed, total) => {
        progressCompleted.value = completed;
        progressTotal.value = total;
      });
    }

    addToast('Verification Complete', 'Ratings, account ages, and Trust Scores verified live.', 'info');
  } catch (err: any) {
    addToast('Error', err?.message || 'Could not load default CSV', 'error');
  } finally {
    isProcessing.value = false;
    isVerifying.value = false;
  }
}
</script>

<style scoped>
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.btn-default-csv {
  box-shadow: 0 4px 12px rgba(217, 107, 67, 0.25);
}

.dropzone {
  border: 2px dashed var(--color-jade-border);
  background: var(--color-jade-light);
  border-radius: var(--radius-md);
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--color-jade-bright);
  background: rgba(0, 168, 107, 0.08);
}

.dropzone.processing {
  cursor: default;
  border-style: solid;
  border-color: var(--color-jade-bright);
  background: white;
}

.hidden-file-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.dropzone-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: white;
  color: var(--color-jade-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-jade-border);
}

.primary-text {
  font-size: 0.95rem;
  color: var(--color-jade-deep);
}

.secondary-text {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.progress-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.spin-icon {
  color: var(--color-jade-bright);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.progress-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-jade-deep);
}

.progress-stats {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.progress-bar-bg {
  width: 100%;
  height: 10px;
  background: var(--color-cream-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-jade-deep), var(--color-jade-bright));
  transition: width 0.15s ease;
  border-radius: var(--radius-full);
}

.file-loaded-banner {
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  background: var(--color-success-bg);
  border: 1px solid rgba(14, 123, 78, 0.2);
  border-radius: var(--radius-sm);
  font-size: 0.825rem;
  color: var(--color-success-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
