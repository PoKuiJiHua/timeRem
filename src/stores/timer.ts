import { defineStore } from 'pinia';
import { Preferences } from '@capacitor/preferences';

const START_TIME_KEY = 'timer_start_time';

export const useTimerStore = defineStore('timer', {
  state: () => ({
    startTime: null as Date | null,
  }),
  
  actions: {
    async setStartTime(time: Date) {
      this.startTime = time;
      await Preferences.set({
        key: START_TIME_KEY,
        value: time.toISOString(),
      });
    },
    
    async getStartTime(): Promise<Date | null> {
      const { value } = await Preferences.get({ key: START_TIME_KEY });
      if (value) {
        return new Date(value);
      }
      return null;
    },
    
    async clearStartTime() {
      this.startTime = null;
      await Preferences.remove({ key: START_TIME_KEY });
    }
  }
}); 