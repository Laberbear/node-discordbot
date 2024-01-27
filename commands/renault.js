const fetch = require('node-fetch');

class Command {
  async getRange() {
    const result = await fetch(`${this.hassUrl}/api/states/${this.rangeEntity}`, {
      headers: { Authorization: `Bearer ${this.hassToken}` },
    });
    const result2 = await result.json();

    return `${result2.state} ${result2.attributes.unit_of_measurement}`;
  }

  async getBatteryLevel() {
    const result = await fetch(`${this.hassUrl}/api/states/${this.batteryEntity}`, {
      headers: { Authorization: `Bearer ${this.hassToken}` },
    });
    const result2 = await result.json();
    console.log(result2);
    return `${result2.state}${result2.attributes.unit_of_measurement}`;
  }

  async getChargingState() {
    const result = await fetch(`${this.hassUrl}/api/states/${this.chargingEntity}`, {
      headers: { Authorization: `Bearer ${this.hassToken}` },
    });
    const result2 = await result.json();

    return result2.state === 'off' ? 'not charging' : 'charging';
  }

  async getMileage() {
    const result = await fetch(`${this.hassUrl}/api/states/${this.mileageEntity}`, {
      headers: { Authorization: `Bearer ${this.hassToken}` },
    });
    const result2 = await result.json();
    const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().replace('Z', '');
    const end = new Date().toISOString().replace('Z', '');

    const result3 = await fetch(`
    ${this.hassUrl}/api/history/period/${start}?filter_entity_id=${this.mileageEntity}&end_time=${end}`, {
      headers: { Authorization: `Bearer ${this.hassToken}` },
    });
    console.log(`${this.hassUrl}/api/history/period/${start}?filter_entity_id=${this.mileageEntity}&end_time=${end}`);
    const result4 = await result3.json();
    const mileage7DaysAgo = result4[0][0].state;
    const mileagePerDay = (result2.state - mileage7DaysAgo) / 7;
    const estimatedMileageEndOfYear = (parseFloat(result2.state) + mileagePerDay * this.getRemainingDays()).toFixed(0);
    const mileageWholeYear = estimatedMileageEndOfYear - this.startMileage;
    console.log(mileagePerDay * this.getRemainingDays());
    return {
      current: `${result2.state} km`,
      last7Days: mileage7DaysAgo,
      mileagePerDay,
      estimatedMileageEndOfYear: `${estimatedMileageEndOfYear} km`,
      mileageWholeYear,
      insurancePercent: ((mileageWholeYear / this.insuranceMaxMileage) * 100).toFixed(0),
      batteryPercent: ((mileageWholeYear / this.batteryMaxMileage) * 100).toFixed(0),
    };
  }

  getRemainingDays() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return 365 - Math.floor(diff / oneDay);
  }

  async getLatestAverageConsumption() {
    const result = await fetch(`${this.hassUrl}/api/states/${this.rangeEntity}`, {
      headers: { Authorization: `Bearer ${this.hassToken}` },
    });
    const result2 = await result.json();
    const result3 = await fetch(`${this.hassUrl}/api/states/${this.capacityEntity}`, {
      headers: { Authorization: `Bearer ${this.hassToken}` },
    });
    const result4 = await result3.json();

    return `${((result4.state / result2.state) * 100).toFixed(1)} kwh/100km`;
  }

  async messageHandler(command, msg, bot) {
    console.log(msg);
    this.hassUrl = bot.config.hassUrl;
    this.hassToken = bot.config.hassToken;
    this.rangeEntity = bot.config.hassCarRange;
    this.capacityEntity = bot.config.hassCarCapacity;
    this.batteryEntity = bot.config.hassCarBattery;
    this.chargingEntity = bot.config.hassCarCharging;
    this.mileageEntity = bot.config.hassCarMileage;
    this.batteryMaxMileage = bot.config.carBatteryMaxMileage;
    this.insuranceMaxMileage = bot.config.carInsuranceMaxMileage;
    this.startMileage = bot.config.carStartOfYearMileage;

    if (command === 'zoepercent') {
      msg.reply(`${await this.getBatteryLevel()}`);
      return;
    }
    const m = await this.getMileage();
    console.log(await this.getMileage());
    msg.reply(`
      Current Range is: ${await this.getRange()} (${await this.getBatteryLevel()})
      This assumes a consumption of ${await this.getLatestAverageConsumption()}
      The car is currently ${await this.getChargingState()}.

      Current Mileage: ${m.current}
      Estimated Mileage at the end of the year (assuming you drive like the last 7 days): ${m.estimatedMileageEndOfYear}
      This is ${m.batteryPercent}% of the battery rental contract and ${m.insurancePercent}% of the car insurance.
    `);
  }

  getCommands() {
    return [{
      name: 'zoe',
      description: 'Get a complete overview of the Zoe Stats',
    }, {
      name: 'zoepercent',
      description: 'Get only the battery level in percent',
    }];
  }
}

module.exports = Command;
