<template>
  <div id="app">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading...</div>
    </div>
    <div v-else>
      <div class="button-container">
        <button @click="fetchChartData('line')">Default Line Graph</button>
        <button @click="fetchChartData('bar')">Default Bar Graph</button>
        <button @click="clearCache">Clear Cache</button>
      </div>
      <form @submit.prevent="fetchChartDataByRange">
        <div class="row">
          <div class="col-25">
            <label for="start">Start Date:</label>
          </div>
          <div class="col-25">
            <input type="date" id="start" v-model="startDate">
          </div>
        </div>
        <div class="row">
          <div class="col-25">
            <label for="end">End Date:</label>
          </div>
          <div class="col-25">
            <input type="date" id="end" v-model="endDate">
          </div>
        </div>
        <div class="row">
          <div class="col-25">
            <label for="graphtype">Graph Type:</label>
          </div>
          <div class="col-25">
            <select id="graphtype" name="graphtype" v-model="chartType">
              <option value="line">Line</option>
              <option value="bar">Bar</option>
            </select>
          </div>
        </div>
        <button type="submit">Fetch Data by Range</button>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import Chart from 'chart.js/auto';

export default {
  name: 'App',
  data() {
    return {
      loading: false,
      chartData: [],
      chartLabels: [],
      chartType: 'line', // Default chart type
      chartInstance: null,
      startDate: '',
      endDate: '',
      ws: null, // WebSocket instance
      sumMap: new Map(),
    };
  },
  methods: {
    fetchChartData(type) {
      this.loading = true;
      axios.get(`http://localhost:8080/data/${type}`)
        .then(response => {
          this.processData(response.data);
          this.chartType = type;
          this.renderChart();
          this.loading = false;
        })
        .catch(error => {
          console.error(`Error fetching ${type} data:`, error);
          this.loading = false;
        });
    },
    fetchChartDataByRange() {
      this.loading = true;
      axios.get('http://localhost:8080/data/range', {
        params: {
          start: this.startDate,
          end: this.endDate,
          type: this.chartType, // Pass selected chart type to the backend
        }
      })
        .then(response => {
          this.processData(response.data);
          this.renderChart();
          this.loading = false;
        })
        .catch(error => {
          console.error('Error fetching data by range:', error);
          this.loading = false;
        });
    },
    clearCache() {
      axios.post('http://localhost:8080/cache/clear-cache')
        .then(() => {
          console.log('Cache cleared successfully');
        })
        .catch(error => {
          console.error('Error clearing cache:', error);
        });
    },
    /**
    * Process WebSocket data received from the server.
    * @param {Object} data - The WebSocket data containing x, y, timestamp, and graph type.
    */
    processWebsocketData(data) {
      const x = data.x;
      const y = data.y;
      const timestamp = data.timestamp;
      const graphtype = data.type;

      if (this.chartType === graphtype){

        // Check if both start and end dates are specified
        if (this.startDate !== '' && this.endDate !== ''){
          // Check if the timestamp falls within the specified date range
          if (this.startDate <= timestamp && timestamp <= this.endDate){
            if (this.sumMap.has(x)) {
              this.sumMap.set(x, this.sumMap.get(x) + y);
            } else {
              this.sumMap.set(x, y);
            }
          }
        } else {
          // Update the sumMap with the new data point (no date range filtering)
          if (this.sumMap.has(x)) {
              this.sumMap.set(x, this.sumMap.get(x) + y);
            } else {
              this.sumMap.set(x, y);
            }
        }
        this.chartLabels = Array.from(this.sumMap.keys());
        this.chartData = Array.from(this.sumMap.values());
      }
    },
    processData(data) {
      data.forEach(point => {
        const x = point.x;
        const y = point.y;
        if (this.sumMap.has(x)) {
          this.sumMap.set(x, this.sumMap.get(x) + y);
        } else {
          this.sumMap.set(x, y);
        }
      });
      this.chartLabels = Array.from(this.sumMap.keys());
      this.chartData = Array.from(this.sumMap.values());
    },
    renderChart() {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }
      const ctx = document.getElementById('myChart').getContext('2d');
      this.chartInstance = new Chart(ctx, {
        type: this.chartType, // Use selected chart type
        data: {
          labels: this.chartLabels,
          datasets: [{
            label: this.chartType === 'line' ? 'Line Graph' : 'Bar Graph',
            data: this.chartData,
            backgroundColor: this.chartType === 'line' ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)',
            borderColor: this.chartType === 'line' ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          }],
        },
      });
    },
    initializeWebSocket() {
      this.ws = new WebSocket('ws://localhost:8080/ws');
      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };
      this.ws.onmessage = event => {
        const newData = JSON.parse(event.data);
        console.log('Received data from websocket', newData);
        this.processWebsocketData(newData);
        this.renderChart();
      };
      this.ws.onerror = error => {
        console.error('WebSocket error:', error);
      };
      this.ws.onclose = () => {
        console.log('WebSocket closed');
      };
    },
  },
  mounted() {
    // Fetch default chart data on component mount
    this.fetchChartData('line');
    // Initialize WebSocket
    this.initializeWebSocket();
  },
  beforeUnmount() {
    // Close WebSocket connection before component is destroyed
    if (this.ws) {
      this.ws.close();
    }
  },
};
</script>


<style>

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

#app {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
  margin: 5px;
  padding: 6px;
}

.loading-container {
  display: flex;
  align-items: center;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 18px;
  color: #333;
}

.button-container {
  margin-top: 20px;
  height: auto; /* Change height to auto */
  width: 100%;
}

#myChart {
  display: block !important; /* Override inline display property */
  width: 80% !important; /* Override inline width property */
  height: 80% !important; /* Override inline height property */
  margin: 20px;
  border: 2px solid black;
  padding: 10px;
  border-radius: 5%;
}

button {
  margin: 0 10px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #0056b3;
}
</style>
