import $ from 'jquery';
import createReactUnit from './unit';
import createElement from './element';
import Component from './component';

let React = {
    nextRootIndex: 0,
    render,
    Component,
    createElement
};

function render(element, container) {
    //工厂方法
    let unitInstance = createReactUnit(element);
    let markUp = unitInstance.getMarkup(React.nextRootIndex);
    $(container).html(markUp);
    $(document).trigger('mounted');
}


export default React;







