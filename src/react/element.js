class Element {
    constructor(type, props) {
        this.type = type;
        this.props = props;
        this.key = props.key;//dom diff 对比用的
    }
}

function createElement(type, props, ...children) {
    props = props || {};
    props.children = children;
    return new Element(type,props);
}

export default createElement;