<template>
  <div id="app" class="container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading...</div>
    </div>
    <div v-else class="content">
      <div class="form-container">
        <h1 class="title">Graph Data Visualization</h1>
        <div class="button-container">
          <button class="btn" @click="fetchChartData('line')">Default Line Graph</button>
          <button class="btn" @click="fetchChartData('bar')">Default Bar Graph</button>
          <button class="btn" @click="clearCache">Clear Cache</button>
        </div>
        <form @submit.prevent="fetchChartDataByRange" class="form">
          <div class="form-group">
            <label class="label" for="start">Start Date:</label>
            <input class="input" type="date" id="start" v-model="startDate">
          </div>
          <div class="form-group">
            <label class="label" for="end">End Date:</label>
            <input class="input" type="date" id="end" v-model="endDate">
          </div>
          <div class="form-group">
            <label class="label" for="graphtype">Graph Type:</label>
            <select class="select" id="graphtype" name="graphtype" v-model="chartType">
              <option value="line">Line</option>
              <option value="bar">Bar</option>
            </select>
          </div>
          <button class="btn btn-primary" type="submit">Fetch Data by Range</button>
        </form>
      </div>
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
          this.renderChart(); // Re-render chart with new data
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
    processData(data) {
      this.sumMap.clear(); // Clear previous data
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
        this.chartInstance.destroy(); // Destroy old chart instance
      }
      const ctx = document.getElementById('myChart').getContext('2d');
      this.chartInstance = new Chart(ctx, {
        type: this.chartType,
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
      processWebsocketData(data) {
      const x = data.x;
      const y = data.y;
      const timestamp = data.timestamp;
      const graphtype = data.type;

      if (this.chartType === graphtype) {
        // Check if both start and end dates are specified
        if (this.startDate !== '' && this.endDate !== '') {
          // Check if the timestamp falls within the specified date range
          if (this.startDate <= timestamp && timestamp <= this.endDate) {
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
    initializeWebSocket() {
      this.ws = new WebSocket('ws://localhost:8080/ws');
      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };
      this.ws.onmessage = event => {
        const newData = JSON.parse(event.data);
        console.log('Received data from websocket', newData);
        this.processWebsocketData([newData]); // Process single data point
        this.renderChart(); // Re-render chart with new data
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
  body {
    font-family: Arial, sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 0;
  }

  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .content {
    width: 100%;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .form-container {
    width: 100%;
    background-color: #fff;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
  }

  .title {
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
    text-align: center;
  }

  .button-container {
    text-align: center;
    margin-bottom: 20px;
  }

  .btn {
    background-color: #4CAF50;
    color: white;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    margin-right: 10px;
  }

  .btn-primary {
    background-color: #007bff;
  }

  .btn:hover {
    background-color: #45a049;
  }

  .form {
    text-align: center;
  }

  .form-group {
    margin-bottom: 20px;
    text-align: left;
  }

  .label {
    font-weight: bold;
    margin-bottom: 5px;
    display: block;
  }

  .input,
  .select {
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #ccc;
    width: calc(100% - 22px); /* Adjusted width to account for padding */
    box-sizing: border-box;
  }
</style>
