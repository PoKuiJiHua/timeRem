<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>时间记录器</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">时间记录器</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- 计时显示区域 -->
      <div class="timer-container">
        <h1 class="timer-display">{{ formattedTime }}</h1>
        <p v-if="isRunning" class="start-time">
          开始于: {{ formatTime(startTime) }}
        </p>
      </div>

      <!-- 今日记录列表 -->
      <div class="records-section" v-if="todayRecords.length > 0">
        <ion-list-header>
          <ion-label>今日记录</ion-label>
        </ion-list-header>
        
        <ion-list>
          <ion-item-sliding v-for="record in todayRecords" :key="record.id">
            <ion-item button @click="showRecordDetail(record)">
              <ion-label>
                <h2>{{ record.title || '未命名' }}</h2>
                <p>{{ formatTime(record.startTime) }} - {{ formatTime(record.endTime) }}</p>
              </ion-label>
            </ion-item>
            
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="confirmDeleteRecord(record.id)">
                删除
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <!-- 无记录时显示 -->
      <div class="no-records" v-else>
        <p>今天还没有记录</p>
      </div>
    </ion-content>

    <!-- 底部计时按钮 -->
    <ion-footer>
      <div class="timer-button-container">
        <ion-button 
          class="timer-button" 
          size="large" 
          expand="block"
          :color="isRunning ? 'danger' : 'primary'"
          @click="toggleTimer"
        >
          {{ isRunning ? '结束计时' : '开始计时' }}
        </ion-button>
      </div>
    </ion-footer>

    <!-- 记录详情模态框 -->
    <ion-modal :is-open="showModal" @didDismiss="closeModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>记录详情</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeModal">关闭</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding" v-if="selectedRecord">
        <ion-item>
          <ion-label position="stacked">标题</ion-label>
          <ion-input v-model="selectedRecord.title" placeholder="未命名"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label>开始时间</ion-label>
          <ion-note slot="end">{{ formatDateTime(selectedRecord.startTime) }}</ion-note>
        </ion-item>

        <ion-item>
          <ion-label>结束时间</ion-label>
          <ion-note slot="end">{{ formatDateTime(selectedRecord.endTime) }}</ion-note>
        </ion-item>

        <ion-item>
          <ion-label>持续时间</ion-label>
          <ion-note slot="end">{{ formatDuration(selectedRecord.duration) }}</ion-note>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">备注</ion-label>
          <ion-textarea v-model="selectedRecord.note" placeholder="添加备注..."></ion-textarea>
        </ion-item>

        <div class="ion-padding">
          <ion-button expand="block" @click="saveRecordChanges">保存更改</ion-button>
        </div>
      </ion-content>
    </ion-modal>

    <!-- 设置标题弹窗 -->
    <ion-alert
      :is-open="showTitlePrompt"
      header="设置标题"
      message="为此次计时添加一个标题"
      :buttons="[
        {
          text: '取消',
          role: 'cancel',
          handler: () => handleTitleCancel()
        },
        {
          text: '确定',
          handler: (data) => handleTitleConfirm(data)
        }
      ]"
      :inputs="[
        {
          placeholder: '未命名',
          name: 'title',
          type: 'text',
          value: recordTitle
        }
      ]"
    ></ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onActivated, nextTick } from 'vue';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonButton,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonListHeader,
  IonInput,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonModal,
  IonButtons,
  IonNote,
  IonTextarea,
  IonAlert,
  alertController
} from '@ionic/vue';
import { useTimerStore } from '../stores/timer';
import { Preferences } from '@capacitor/preferences';
import { eventBus, EventType, lastModifiedDate } from '../stores/events';

// 定义记录类型
interface TimeRecord {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  note: string;
}

// 状态管理
const timerStore = useTimerStore();
const isRunning = ref(false);
const startTime = ref<Date | null>(null);
const elapsedTime = ref(0);
const recordTitle = ref('');
const todayRecords = ref<TimeRecord[]>([]);
const justStopped = ref(false);
const showModal = ref(false);
const selectedRecord = ref<TimeRecord | null>(null);
const showTitlePrompt = ref(false);
const isLoading = ref(false);

let timerInterval: ReturnType<typeof setInterval> | null = null;
let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;

// 格式化显示的时间
const formattedTime = computed(() => {
  if (!isRunning.value && elapsedTime.value === 0) {
    return '00:00:00';
  }
  
  const totalSeconds = Math.floor(elapsedTime.value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
});

// 辅助函数：补零
function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

// 格式化日期时间 (带秒)
function formatDateTime(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// 格式化时间 (不带秒)
function formatTime(date: Date | null | string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 格式化持续时间
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// 获取今天的日期字符串作为存储键
function getTodayKey(): string {
  const today = new Date();
  return `records_${today.getFullYear()}_${padZero(today.getMonth() + 1)}_${padZero(today.getDate())}`;
}

// 加载今日记录，使用防抖功能避免频繁加载
async function loadTodayRecords() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  const key = getTodayKey();
  
  try {
    const { value } = await Preferences.get({ key });
    
    if (value) {
      try {
        const records = JSON.parse(value);
        const parsedRecords = records.map((record: any) => ({
          ...record,
          startTime: new Date(record.startTime),
          endTime: new Date(record.endTime)
        }));
        
        // 按结束时间倒序排序，最新记录显示在前面
        parsedRecords.sort((a: TimeRecord, b: TimeRecord) => 
          b.endTime.getTime() - a.endTime.getTime()
        );
        
        todayRecords.value = parsedRecords;
      } catch (e) {
        console.error('Error parsing records:', e);
        todayRecords.value = [];
      }
    } else {
      todayRecords.value = [];
    }
  } catch (error) {
    console.error('Error loading records:', error);
  } finally {
    isLoading.value = false;
  }
}

// 保存记录
async function saveRecord(record: TimeRecord) {
  const key = getTodayKey();
  
  try {
    // 首先获取当前记录
    const { value } = await Preferences.get({ key });
    let currentRecords: TimeRecord[] = [];
    
    if (value) {
      try {
        const parsedRecords = JSON.parse(value);
        currentRecords = parsedRecords.map((r: any) => ({
          ...r,
          startTime: new Date(r.startTime),
          endTime: new Date(r.endTime)
        }));
      } catch (e) {
        console.error('Error parsing existing records:', e);
      }
    }
    
    // 添加新记录
    const newRecords = [...currentRecords, record];
    
    // 保存记录
    await Preferences.set({
      key,
      value: JSON.stringify(newRecords)
    });
    
    // 记录最后修改的日期
    lastModifiedDate.value = new Date().toISOString().split('T')[0];
    
    // 发送记录添加事件
    eventBus.emit(EventType.RECORD_ADDED, { date: getTodayKey() });
    
    // 重新加载记录以保持一致
    await loadTodayRecords();
  } catch (error) {
    console.error('Error saving record:', error);
    // 显示错误提示
    const alert = await alertController.create({
      header: '保存失败',
      message: '保存记录时出错，请重试',
      buttons: ['确定']
    });
    await alert.present();
  }
}

// 开始/结束计时
function toggleTimer() {
  if (isRunning.value) {
    stopTimer();
  } else {
    // 显示设置标题弹窗
    showTitlePrompt.value = true;
  }
}

// 处理标题取消
function handleTitleCancel() {
  showTitlePrompt.value = false;
  recordTitle.value = '';
  // 默认以"未命名"开始计时
  startTimer();
}

// 处理标题确认
function handleTitleConfirm(data: { title: string }) {
  showTitlePrompt.value = false;
  recordTitle.value = data.title || '';
  startTimer();
}

// 开始计时
function startTimer() {
  startTime.value = new Date();
  isRunning.value = true;
  justStopped.value = false;
  elapsedTime.value = 0;
  
  // 保存开始时间到存储
  timerStore.setStartTime(startTime.value);
  
  // 启动计时器
  timerInterval = setInterval(() => {
    const now = new Date();
    elapsedTime.value = now.getTime() - startTime.value!.getTime();
  }, 1000);
}

// 结束计时
async function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.value!.getTime();
  
  // 创建新记录
  const newRecord: TimeRecord = {
    id: Date.now().toString(),
    title: recordTitle.value,
    startTime: startTime.value!,
    endTime,
    duration,
    note: ''
  };
  
  // 重置状态
  isRunning.value = false;
  justStopped.value = true;
  await timerStore.clearStartTime();
  
  // 保存记录
  await saveRecord(newRecord);
  
  // 重置UI状态
  recordTitle.value = '';
  elapsedTime.value = 0; // 重置计时器显示
  
  // 3秒后清除"刚停止"状态
  setTimeout(() => {
    justStopped.value = false;
  }, 3000);
}

// 显示记录详情
function showRecordDetail(record: TimeRecord) {
  selectedRecord.value = JSON.parse(JSON.stringify(record)); // 深拷贝
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  nextTick(() => {
    selectedRecord.value = null;
  });
}

// 保存记录更改
async function saveRecordChanges() {
  if (!selectedRecord.value) return;
  
  const key = getTodayKey();
  
  try {
    // 读取当前存储的记录
    const { value } = await Preferences.get({ key });
    
    if (!value) {
      throw new Error('No records found');
    }
    
    // 解析现有记录
    const currentRecords = JSON.parse(value);
    
    // 更新特定记录
    const updatedRecords = currentRecords.map((record: any) => {
      if (record.id === selectedRecord.value?.id && selectedRecord.value) {
        return { 
          ...selectedRecord.value,
          startTime: new Date(selectedRecord.value.startTime).toISOString(),
          endTime: new Date(selectedRecord.value.endTime).toISOString()
        };
      }
      return record;
    });
    
    // 保存更新后的记录
    await Preferences.set({
      key,
      value: JSON.stringify(updatedRecords)
    });
    
    // 记录最后修改的日期
    lastModifiedDate.value = new Date().toISOString().split('T')[0];
    
    // 发送记录更新事件
    eventBus.emit(EventType.RECORD_UPDATED, { date: getTodayKey() });
    
    // 重新加载记录
    await loadTodayRecords();
    closeModal();
  } catch (error) {
    console.error('Error saving record changes:', error);
    // 显示错误提示
    const alert = await alertController.create({
      header: '保存失败',
      message: '保存记录更改时出错，请重试',
      buttons: ['确定']
    });
    await alert.present();
  }
}

// 确认删除记录
async function confirmDeleteRecord(id: string) {
  const alert = await alertController.create({
    header: '确认删除',
    message: '确定要删除这条记录吗？',
    buttons: [
      {
        text: '取消',
        role: 'cancel'
      },
      {
        text: '删除',
        role: 'destructive',
        handler: () => {
          deleteRecord(id);
        }
      }
    ]
  });

  await alert.present();
}

// 删除记录
async function deleteRecord(id: string) {
  const key = getTodayKey();
  
  try {
    // 读取现有记录
    const { value } = await Preferences.get({ key });
    
    if (!value) return;
    
    // 解析记录
    const records = JSON.parse(value);
    
    // 过滤掉要删除的记录
    const updatedRecords = records.filter((record: any) => record.id !== id);
    
    // 保存更新后的记录
    await Preferences.set({
      key,
      value: JSON.stringify(updatedRecords)
    });
    
    // 记录最后修改的日期
    lastModifiedDate.value = new Date().toISOString().split('T')[0];
    
    // 发送记录删除事件
    eventBus.emit(EventType.RECORD_DELETED, { date: getTodayKey() });
    
    // 更新UI
    todayRecords.value = todayRecords.value.filter(record => record.id !== id);
  } catch (error) {
    console.error('Error deleting record:', error);
    // 如果删除失败，重新加载数据
    loadTodayRecords();
  }
}

// 设置自动刷新间隔（每30秒刷新一次）
function setupAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  autoRefreshInterval = setInterval(() => {
    if (!isLoading.value && !showModal.value) {
      loadTodayRecords();
    }
  }, 30000);
}

// 组件激活时刷新数据
onActivated(() => {
  loadTodayRecords();
  setupAutoRefresh();
});

// 组件挂载时的操作
onMounted(async () => {
  // 加载今日记录
  await loadTodayRecords();
  
  // 检查是否有未完成的计时
  const savedStartTime = await timerStore.getStartTime();
  
  if (savedStartTime) {
    // 恢复未完成的计时
    startTime.value = new Date(savedStartTime);
    isRunning.value = true;
    
    // 计算已经过去的时间
    const now = new Date();
    elapsedTime.value = now.getTime() - startTime.value.getTime();
    
    // 重新启动计时器
    timerInterval = setInterval(() => {
      const now = new Date();
      elapsedTime.value = now.getTime() - startTime.value!.getTime();
    }, 1000);
  }
  
  // 设置自动刷新
  setupAutoRefresh();
  
  // 添加事件监听，当其他页面发生数据变化时刷新
  const handleRecordChange = () => {
    // 只有在今日记录页面时才刷新
    const today = new Date().toISOString().split('T')[0];
    const dateKey = getTodayKey();
    if (dateKey.includes(today)) {
      loadTodayRecords();
    }
  };
  
  // 监听所有可能的记录变化事件
  eventBus.on(EventType.RECORD_UPDATED, handleRecordChange);
  eventBus.on(EventType.RECORD_DELETED, handleRecordChange);
  eventBus.on(EventType.ALL_RECORDS_CLEARED, handleRecordChange);
  
  // 记得在组件卸载时移除事件监听
  onBeforeUnmount(() => {
    eventBus.off(EventType.RECORD_UPDATED, handleRecordChange);
    eventBus.off(EventType.RECORD_DELETED, handleRecordChange);
    eventBus.off(EventType.ALL_RECORDS_CLEARED, handleRecordChange);
    
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
  });
});
</script>

<style scoped>
.timer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}

.timer-display {
  font-size: 3rem;
  font-weight: bold;
  margin: 0;
  color: var(--ion-color-dark);
}

.start-time {
  color: var(--ion-color-medium);
  margin-top: 0.5rem;
}

.records-section {
  margin-top: 2rem;
}

.no-records {
  text-align: center;
  margin-top: 2rem;
  color: var(--ion-color-medium);
}

.timer-button-container {
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.timer-button {
  width: 80%;
  height: 50px;
  --border-radius: 25px;
}
</style> 