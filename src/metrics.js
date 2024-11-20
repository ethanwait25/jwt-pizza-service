const config = require("./config.js");
const os = require("os");

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.getRequests = 0;
    this.putRequests = 0;
    this.postRequests = 0;
    this.deleteRequests = 0;

    this.activeUsers = 0;

    this.successfulAuth = 0;
    this.failedAuth = 0;

    this.soldPizzas = 0;
    this.failedCreations = 0;
    this.revenue = 0;

    this.serviceLatency = 0;
    this.pizzaLatency = 0;

    this.sendMetricsPeriodically(10000);
  }

  incrementTotalRequests() {
    this.totalRequests++;
  }

  incrementGetRequests() {
    this.getRequests++;
    this.incrementTotalRequests();
  }

  incrementPutRequests() {
    this.putRequests++;
    this.incrementTotalRequests();
  }

  incrementPostRequests() {
    this.postRequests++;
    this.incrementTotalRequests();
  }

  incrementDeleteRequests() {
    this.deleteRequests++;
    this.incrementTotalRequests();
  }

  incrementActiveUsers() {
    this.activeUsers++;
  }

  decrementActiveUsers() {
    if (this.activeUsers > 0)
      this.activeUsers--;
  }

  incrementSuccessfulAuth() {
    this.successfulAuth++;
  }

  incrementFailedAuth() {
    this.failedAuth++;
  }

  incrementSoldPizzas() {
    this.soldPizzas++;
  }

  incrementFailedCreations() {
    this.failedCreations++;
  }

  addRevenue(value) {
    this.revenue += value;
  }

  setServiceLatency(value) {
    this.serviceLatency = value;
  }

  setPizzaLatency(value) {
    this.pizzaLatency = value;
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  getOrderMetrics(order) {
    for (const item of order.items) {
        this.incrementSoldPizzas();
        this.addRevenue(item.price);
    }
  }

  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        const builder = new MetricBuilder();
        
        builder.addHttpMetric("total_requests", this.totalRequests);
        builder.addHttpMetric("get", this.getRequests);
        builder.addHttpMetric("put", this.putRequests);
        builder.addHttpMetric("post", this.postRequests);
        builder.addHttpMetric("delete", this.deleteRequests);

        builder.addUserMetric("active_users", this.activeUsers);

        builder.addAuthMetric("success", this.successfulAuth);
        builder.addAuthMetric("failed", this.failedAuth);

        builder.addPurchaseMetric("sold", this.soldPizzas);
        builder.addPurchaseMetric("failed", this.failedCreations);
        builder.addPurchaseMetric("revenue", this.revenue);

        builder.addSystemMetric("cpu", this.getCpuUsagePercentage());
        builder.addSystemMetric("memory", this.getMemoryUsagePercentage());
        builder.addSystemMetric("latency_service", this.serviceLatency);
        builder.addSystemMetric("latency_pizza", this.pizzaLatency);

        const metrics = builder.toString();
        this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
    timer.unref();
  }

  sendMetricToGrafana(metrics) {
    fetch(`${config.metrics.url}`, {
      method: "post",
      body: metrics,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error("Failed to push metrics data to Grafana");
        } else {
          console.log(`Pushed ${metrics}`);
        }
      })
      .catch((error) => {
        console.error("Error pushing metrics:", error);
      });
  }

  requestTracker(req, res, next) {
    switch (req.method) {
      case "GET":
        this.incrementGetRequests();
        break;
      case "PUT":
        this.incrementPutRequests();
        break;
      case "POST":
        this.incrementPostRequests();
        break;
      case "DELETE":
        this.incrementDeleteRequests();
        break;
      default:
        break;
    }
    next();
  }
}

class MetricBuilder {
    metricRequest = "";

    addMetric(prefix, type, value) {
        this.metricRequest += `${prefix},source=${config.metrics.source},type=${type} total=${value} \n`;
    }

    addHttpMetric(type, value) {
        this.addMetric("request", type, value);
    }
    
    addSystemMetric(type, value) {
        this.addMetric("system", type, value);
    }

    addUserMetric(type, value) {
        this.addMetric("user", type, value);
    }

    addPurchaseMetric(type, value) {
        this.addMetric("purchase", type, value);
    }

    addAuthMetric(type, value) {
        this.addMetric("auth", type, value);
    }

    toString() {
        return this.metricRequest;
    }
}

const metrics = new Metrics();
module.exports = metrics;
