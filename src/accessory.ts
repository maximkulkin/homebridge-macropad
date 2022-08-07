import { AccessoryConfig, AccessoryPlugin, API, Logging, Service } from 'homebridge'
import { MacroPad, ButtonEventType } from '@maximkulkin/macropad'

// module.exports = (api: API) => {
export default (api: API) => {
  api.registerAccessory('MacroPad', MacroPadAccessoryPlugin)
}

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

  private readonly device: MacroPad

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log
    this.api = api

    this.device = new MacroPad(this.log.debug)
    this.device.on('button', this._on_button_event.bind(this))

    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Adafruit')
      .setCharacteristic(this.api.hap.Characteristic.Model, 'Macropad RP2040')
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, 'Default-Serial')

    this.buttonServices = []
    for (let i=0; i < 12; i++) {
      const buttonService = new this.api.hap.Service.StatelessProgrammableSwitch('Key' + i, 'key' + i)
      buttonService.setCharacteristic(this.api.hap.Characteristic.ServiceLabelIndex, i)
      this.buttonServices.push(buttonService)
    }

    this.device.start()
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

  identify(): void {
    this.log.info('Identify!')
  }

  getServices(): Service[] {
    return [this.informationService].concat(this.buttonServices)
  }
}
