import React from './react';

class Counter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {number: 0};
    }

    componentWillMount() {
        console.log('组件将要挂载');
    }

    componentDidMount() {
        console.log('组件挂载完毕');
        // setInterval(() => {
        //     this.setState({number: this.state.number + 1});
        // }, 1000);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return true;
    }

    handleClick = () => {
        this.setState({number: this.state.number + 1});
    };

    render() {
        // return this.state.number;
        let p = React.createElement('p', {}, this.state.number);
        let button = React.createElement('button', {onClick: this.handleClick}, '+');
        return React.createElement('div', {id: 'counter'}, p, button);
    }
}


let element = React.createElement(Counter, {name: '我的计数器'});

React.render(element, document.getElementById('root'));



