export class ShipCellDto {
  row: number
  col: number
}

export class CreateShipDto {
  prizeId: string
  cells: ShipCellDto[]
}
