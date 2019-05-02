import $ from 'jquery';

class Unit {
    constructor(element) {
        this._currentElement = element;
    }
}

class ReactTextUnit extends Unit {
    getMarkup(rootId) {
        this._rootId = rootId;
        return `<span data-react-id="${rootId}">${this._currentElement}</span>`;
        // return this._currentElement;
    }

    update(nextElement) {
        if (this._currentElement !== nextElement) {
            this._currentElement = nextElement;
            $(`[data-react-id="${this._rootId}"]`).html(nextElement);
        }
    }
}

class ReactNativeUnit extends Unit {
    getMarkup(rootId) {
        this._rootId = rootId;
        let {type, props} = this._currentElement;
        let tagStart = `<${type} data-react-id="${rootId}" `;
        let childString = '';
        let tagEnd = `</${type}>`;
        let renderedUnitChildren = [];
        for (let key in props) {
            //事件属性
            if (/^on[A-Z]/.test(key)) {
                let eventType = key.slice(2).toLowerCase();
                $(document).on(eventType, `[data-react-id="${rootId}"]`, props[key]);
            } else if (key === 'children') {
                let children = props.children || [];
                childString = children.map((child, index) => {
                    let childReactUnit = createReactUnit(child);
                    renderedUnitChildren.push(childReactUnit);
                    //子元素的id = 父元素的id + 当前子元素的索引
                    return childReactUnit.getMarkup(`${rootId}.${index}`);
                }).join('');
            } else {
                tagStart += (' ' + key + '=' + props[key]);
            }

        }
        this.renderedUnitChildren = renderedUnitChildren;
        return tagStart + '>' + childString + tagEnd;
    }

    update(nextElement) {
        this._currentElement = nextElement;
        //获取旧的属性对象
        let oldProps = this._currentElement.props;
        //获取新的属性对象
        let newProps = nextElement.props;
        //修改属性对象
        this.updateProperties(oldProps,newProps);
        //更新子元素
        this.updateChildren(newProps.children);
    }
    //更新子元素 参数是新的儿子节点
    updateChildren(newChildrenElements){
        this.diff(newChildrenElements);
    }
    //进行DOMDIFF进行比较
    diff(newChildrenElements){
        //为了判断新的元素在旧的元素里有没有
        let oldChildrenMap = this.getChildrenMap(this.renderedUnitChildren);
        this.getNewChildren(oldChildrenMap,newChildrenElements);
    }
    //这个方法的作用是获取新的虚拟DOM元素 还会直接修改匹配的属性
    getNewChildren(oldChildrenMap,newChildrenElements){
        let newChildren = [];
        newChildrenElements.forEach((newElement,idx)=>{
            let newKey = (newElement.props&&newElement.props.key)||idx.toString();
            //通过key找到旧的unit
            let oldChild = oldChildrenMap[newKey];
            let oldElement = oldChild&&oldChild._currentElement;
            //比较新旧的元素是否一样，如果是一样的，可以进行深度比较
            if(shouldDeepCompare(oldElement,newElement)){
                oldChild.update(newElement);
                //如果当前的key在老的集合里有，则可以复用旧的unit
                newChildren[idx] = oldChild;
            }else{//不需要深度比较,直接 创建新的unit进行赋值
                let newChildInstance = createReactUnit(newElement);
                newChildren[idx] = newChildInstance;
            }
        });
        return newChildren;
    }
    getChildrenMap(children){
        let childrenMap = {};
        for(let i=0;i<children.length;i++){
            //如果说元素给了key了就用元素的key,如果没有给key 则用前子元素的索引当成key
            let key = (children[i]._currentElement.props&&children[i]._currentElement.props.key) || i.toString();
            childrenMap[key] = children[i];
        }
        return childrenMap;
    }
    //执行这个方法的时候，属性是直接操作DOM修改掉了
    updateProperties(oldProps,newProps){
        let propKey;
        for(propKey in oldProps){
            //如果此老属性在新的属性对象中没有，或者说不存在
            if(!newProps.hasOwnProperty(propKey)){
                $(`[data-reactid="${this._rootId}"]`).removeAttr(propKey);
            }
            if(/^on[A-Z]/.test(propKey)){
                $(document).undelegate('.'+this._rootId);
            }
        }
        for(propKey in newProps){
            if(propKey == 'children') continue;
            //重新绑定事件
            if(/^on[A-Z]/.test(propKey)){
                let eventType = propKey.slice(2).toLowerCase();//event.0
                $(document).delegate(`[data-reactid="${this._rootId}"]`,`${eventType}.${this._rootId}`,newProps[propKey]);
                continue;
            }
            //更新新的属性
            $(`[data-reactid="${this._rootId}"]`).prop(propKey,newProps[propKey]);
        }
    }

}

class ReactCompositeUnit extends Unit {
    //自定义组件渲染内容由 render 方法返回值决定的
    //render 方法返回值是一个虚拟 DOM
    getMarkup(rootId) {
        this._rootId = rootId;
        let {type: Component, props} = this._currentElement;
        //先创建Counter组件的实例，这里的Component就是传给render函数的Counter组件
        let componentInstance = this._componentInstance = new Component(props);
        //将此组件的实例的unit属性指向自己
        this._componentInstance.unit = this;
        //如果有组件即将挂载的函数就执行它
        componentInstance.componentWillMount && componentInstance.componentWillMount();
        //得到render方法得到返回的虚拟DOM
        let renderedElement = componentInstance.render();
        //获取将要渲染的单元实例 并存放到当前unit的_renderedUnitInstance属性上
        let renderedUnitInstance = this._renderedUnitInstance = createReactUnit(renderedElement);
        //获取对应的HTML字符串
        let renderedMarkup = renderedUnitInstance.getMarkup(rootId);
        //由子节点触发
        $(document).on('mounted', () => {
            componentInstance.componentDidMount && componentInstance.componentDidMount();
        });
        return renderedMarkup;
    }

    //更新有两种可能：状态更新，元素更新
    update(nextElement, partialState) {
        //确定新的元素(虚拟dom)
        this._currentElement = nextElement || this._currentElement;
        //更新状态
        let nextState = this._componentInstance.state = Object.assign(this._componentInstance.state, partialState);
        let nextProps = this._componentInstance.props;
        if (this._componentInstance.shouldComponentUpdate && !this._componentInstance.shouldComponentUpdate(nextProps, nextState)) {
            //如果有shouldComponentUpdate，并且shouldComponentUpdate方法返回false，那么就退出
            return false;
        }
        this._componentInstance.componentWillUpdate && this._componentInstance.componentWillUpdate();
        let preRenderedUnitInstance = this._renderedUnitInstance;
        //旧的元素（虚拟dom）
        let preRenderedElement = preRenderedUnitInstance._currentElement;
        //新的元素（虚拟dom）
        let nextRenderElement = this._componentInstance.render();
        if (shouldDeepCompare(preRenderedElement, nextRenderElement)) {
            //真正的深度比较：当前组件只需要比较组件自身，不需要考虑子元素怎么比较，让下面的组件自己去比较就行
            preRenderedUnitInstance.update(nextRenderElement);
            this._componentInstance.componentDidUpdate && this._componentInstance.componentDidUpdate();
        } else {
            //如果不需要深度比较，直接用新的元素替换旧的元素，
            this._renderedUnitInstance = createReactUnit(nextRenderElement);
            let nextMarkup = this._renderedUnitInstance.getMarkup();
            $(`[data-react-id="${this._rootId}"]`).replaceWith(nextMarkup);
        }

    }
}

function shouldDeepCompare(oldElement, newElement) {
    if (oldElement != null && newElement != null) {
        let oldType = typeof oldElement;
        let newType = typeof newElement;
        if (oldType === 'string' || oldType === 'number') {
            return newType === 'string' || newType === 'number';
        } else {
            return newType === 'object' && oldElement.type === newElement.type;
        }
    } else {
        //如果任意一个节点为null，就不用进行深度比较了
        return false;
    }
}

//工厂方法，根据参数类型生成不同类型的实例
function createReactUnit(element) {
    if (typeof element == 'number' || typeof element == 'string') {
        return new ReactTextUnit(element);
    }
    if (typeof element == 'object' && typeof element.type == 'string') {
        return new ReactNativeUnit(element);
    }
    if (typeof element == 'object' && typeof element.type == 'function') {
        return new ReactCompositeUnit(element);
    }

}

export default createReactUnit;






















