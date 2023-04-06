function shuffle(array: string[]) :string[] {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

const deck  = require("../data/deck.json")

const cards : { [id:string]:Card } = require("../data/cards.json")

const effects : {[effectName:string]:(game: Game, count: number)=>void} = {
    "reverse" : (game: Game, count: number) => count%2==1?game.players.reverse():void(0),
    "skip" : (game: Game, count: number) => game.increaseTurnIndex(count),
    "burn" : (game: Game) => game.burnStack(),
    "copy" : (game: Game, count: number) => game.copy(count)
}

interface Card{
    id: string
    valids: string[]
    effects?: string[]
}

enum Zone{
    HAND = "hand",
    TOP = "top",
    BOTTOM = "bottom"
}

interface Player{
    id: string
    zones: {[id:string]:string[]}
}

export class Game{
    currentTurnIndex: number
    gameplaystack: string[] // needed for copy effect
    physicalStack: string[] // needed for copy effect
    deck: string[] // where you draw
    players: Player[]
    endTurnEffects: (()=>void)[]
    constructor(playerIds: string[]){
        this.currentTurnIndex = 0
        this.gameplaystack = []
        this.physicalStack = []
        this.deck = shuffle(deck)
        this.players = []
        this.endTurnEffects = []
        playerIds.forEach(id => {
            const zones = {
                "hand" : this.dealZone(),
                "top" : this.dealZone(),
                "bottom" : this.dealZone(),
            }
            console.log(zones)
            this.players.push({id,zones})
        });
    }

    get currentPlayer(){
        return this.players[this.currentTurnIndex]
    }

    dealZone() : string[]{
        return [this.getCard()!,this.getCard()!,this.getCard()!]
    }

    endOfTurn(){
        while(this.deck.length > 0 && this.currentPlayer.zones[Zone.HAND].length < 3){
            this.draw()
        }
        this.endTurnEffects.forEach(effect => {
            effect()
        });
        this.increaseTurnIndex(1)
    }

    draw(){
        const card = this.getCard()
        if(card){
            this.currentPlayer.zones[Zone.HAND].push(card)
        }
    }

    getCard() : string|undefined{
        if(this.deck.length > 0){
            return this.deck.pop()!
        }
        return undefined
    }

    play(indices: number[]) : boolean{
        console.log("playing card #"+indices)

        let firstZone : string | undefined // find out which zone the player is playing from
        Object.keys(this.currentPlayer.zones).forEach(zone => {
            if(this.currentPlayer.zones[zone].length>0 && firstZone === undefined){
                firstZone = zone
            }
        })          
        console.log("card is coming from "+firstZone)

        this.playFromZone(this.currentPlayer.zones[firstZone as Zone], indices)

        console.log("player: " + JSON.stringify(this.currentPlayer.zones))

        this.endOfTurn()
        
        console.log("player: " + JSON.stringify(this.currentPlayer.zones))
        return firstZone == Zone.BOTTOM && this.currentPlayer.zones[firstZone].length == 0
    }

    pickUpStack(){
        this.physicalStack.forEach(card => {
            this.currentPlayer.zones["hand"].push(card)
        });
        this.physicalStack = []
        this.gameplaystack = []
    }

    get topCard(){
        return this.gameplaystack[this.gameplaystack.length-1]
    }

    get equalTopCount(){
        if(this.physicalStack.length == 0){
            return 0;
        }

        let sameOnStack = 0
        for(let i = this.physicalStack.length-1; i > 0; i--){
            if(this.physicalStack[i]===this.topCard){
                sameOnStack++;
            }
            else{
                break;
            }
        }
        return sameOnStack;
    }

    cardIsValid(card: Card): boolean{
        return this.gameplaystack.length == 0 || card.valids.includes(this.topCard);
    }

    playFromZone(zone: string[], indices: number[]) : boolean{        
        const card = cards[zone[indices[0]]] // get the card object
        indices.forEach(index => { // make sure all cards attempted to be played are the same
            if(zone[index] !== card.id){
                throw("playing nonequal multiples")
            }
        });

        console.log("playing card: " + JSON.stringify(card))

        if(!this.cardIsValid(card)){ // handle picking up the stack if its not a valid play
            this.pickUpStack()
            return false
        }

        this.moveFromZoneToStack(zone, indices)

        if(this.equalTopCount==4){
            this.endTurnEffects.push(()=>this.burnStack())
        }
        else{
            this.applyCardEffects(card, indices.length)
        }

        console.log("stack: " + this.gameplaystack)
        return true
    }

    moveFromZoneToStack(zone: string[], indices: number[]){
        indices.forEach(index => {
            this.physicalStack.push(zone[index])
            this.gameplaystack.push(zone[index])
            zone.splice(index, 1)
        });
    }

    applyCardEffects(card: Card, count: number){
        if(card.effects){
            card.effects.forEach(effect => {
                this.endTurnEffects.push(()=>effects[effect](this, count))
            });
        }
    }

    burnStack(){
        this.physicalStack = []
        this.gameplaystack = []
        this.decreaseTurnIndex()
    }

    copy(count: number){
        if(this.gameplaystack.length>count){
            const cardToCopy = this.gameplaystack[this.gameplaystack.length-(count+1)]
            for(let i = 0; i < count; i++){
                this.gameplaystack[this.gameplaystack.length-i] = cardToCopy
            }
        }
    }

    increaseTurnIndex(count: number){
        this.currentTurnIndex = (this.currentTurnIndex+count)%this.players.length
    }
    
    decreaseTurnIndex(){
        this.currentTurnIndex = ((this.currentTurnIndex-1) + this.players.length)%this.players.length
    }
}