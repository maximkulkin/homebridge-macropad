import { AccessoryConfig, AccessoryPlugin, API, Logging, Service } from 'homebridge'
import { MacroPad, ButtonEventType } from '@maximkulkin/macropad'
import * as Color from 'color'

// module.exports = (api: API) => {
export default (api: API) => {
  api.registerAccessory('MacroPad', MacroPadAccessoryPlugin)
}

const NUMBER_OF_KEYS = 12

const eventValues = {}
eventValues[ButtonEventType.SINGLE_PRESS] = 0
eventValues[ButtonEventType.DOUBLE_PRESS] = 1
eventValues[ButtonEventType.LONG_PRESS] = 2

const eventNames = {}
eventNames[ButtonEventType.SINGLE_PRESS] = 'single press'
eventNames[ButtonEventType.DOUBLE_PRESS] = 'double press'
eventNames[ButtonEventType.LONG_PRESS] = 'long press'

class MacroPadAccessoryPlugin implements AccessoryPlugin {
  private readonly log: Logging
  private readonly api: API

  private readonly informationService: Service
  private readonly buttonServices: Service[]
  private readonly lightServices: Service[]
  private lightOn: boolean[]
  private lightColor: Color[]

  private readonly device: MacroPad

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log
    this.api = api

    // this.device = new MacroPad(this.log.debug)
    this.device = new MacroPad()
    this.device.on('button', this._on_button_event.bind(this))

    const Char = this.api.hap.Characteristic
    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(Char.Manufacturer, 'Adafruit')
      .setCharacteristic(Char.Model, 'Macropad RP2040')
      .setCharacteristic(Char.SerialNumber, 'Default-Serial')

    this.buttonServices = []
    this.lightServices = []
    this.lightOn = []
    this.lightColor = []
    for (let i=0; i < NUMBER_OF_KEYS; i++) {
      const buttonService = new this.api.hap.Service.StatelessProgrammableSwitch('Key ' + (i + 1), 'key' + (i + 1))
      buttonService.setCharacteristic(Char.ServiceLabelIndex, i+1)
      this.buttonServices.push(buttonService)

      const lightService = new this.api.hap.Service.Lightbulb('Key Light ' + (i + 1), 'light' + (i + 1))
      lightService.getCharacteristic(Char.On)
        .onGet(this._getLightOn.bind(this, i))
        .onSet(this._setLightOn.bind(this, i))

      lightService.getCharacteristic(Char.Hue)
        .onGet(this._getLightHue.bind(this, i))
        .onSet(this._setLightHue.bind(this, i))

      lightService.getCharacteristic(Char.Saturation)
        .onGet(this._getLightSaturation.bind(this, i))
        .onSet(this._setLightSaturation.bind(this, i))

      lightService.getCharacteristic(Char.Brightness)
        .onGet(this._getLightBrightness.bind(this, i))
        .onSet(this._setLightBrightness.bind(this, i))

      lightService.setCharacteristic(Char.ServiceLabelIndex, i + 1)
      this.lightOn.push(false)
      this.lightColor.push(Color.hsv(0, 255, 255))
      this.lightServices.push(lightService)
    }

    this.device.on('connected', this._update_lights.bind(this))
    this.device.start()
  }

  _getLightOn(index) {
    return this.lightOn[index]
  }

  _setLightOn(index, value) {
    this.lightOn[index] = value
    this._update_light(index)
  }

  _getLightHue(index) {
    return this.lightColor[index].hue()
  }

  _setLightHue(index, value) {
    this.lightColor[index] = this.lightColor[index].hue(value)
    this._update_light(index)
  }

  _getLightSaturation(index) {
    return this.lightColor[index].saturationv()
  }

  _setLightSaturation(index, value) {
    this.lightColor[index] = this.lightColor[index].saturationv(value)
    this._update_light(index)
  }

  _getLightBrightness(index) {
    return this.lightColor[index].value();
  }

  _setLightBrightness(index, value) {
    this.lightColor[index] = this.lightColor[index].value(value)
    this._update_light(index)
  }

  _on_button_event(buttonIndex, buttonEvent) {
    if (buttonIndex < 0 || buttonIndex >= this.buttonServices.length)
      return

    this.log.info('Button ' + buttonIndex + ' ' + eventNames[buttonEvent])
    this.buttonServices[buttonIndex].updateCharacteristic(
      this.api.hap.Characteristic.ProgrammableSwitchEvent,
      eventValues[buttonEvent],
    )
  }

  _update_light(index) {
    if (!this.lightOn[index]) {
      this.device.setLightOff(index)
      return
    }

    this.device.setLight(index, this.lightColor[index])
  }

  _update_lights() {
    for (let i=0; i < NUMBER_OF_KEYS; i++) {
      this._update_light(i)
    }
  }

  identify(): void {
    this.log.info('Identify!')
    for (let i=0; i < NUMBER_OF_KEYS; i++) {
      this.device.setLight(i + 1, Color.rgb(0, 255, 0))
    }
    setTimeout(this._update_lights, 3000)
  }

  getServices(): Service[] {
    return [this.informationService]
      .concat(this.buttonServices)
      .concat(this.lightServices)
  }
}
