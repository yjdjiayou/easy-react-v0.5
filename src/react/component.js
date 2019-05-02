class Component {
    constructor(props) {
        this.props = props;
    }
    setState(partialState){
        this.unit.update(null,partialState);
    }
}

export default Component;