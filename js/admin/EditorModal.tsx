// Because react-modal doesn't work so well with Preact.

import * as _ from 'lodash'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

export default class EditorModal extends React.Component<{ children: any }> {
    modalContainer: HTMLDivElement

    componentDidMount() {
        let modalContainer = document.createElement('div')
        modalContainer.className = "editorModal"
        document.body.appendChild(modalContainer)
        this.modalContainer = modalContainer

        this.componentDidUpdate()
    }

    componentWillUnmount() {
        document.body.removeChild(this.modalContainer)
    }

    componentDidUpdate() {
        ReactDOM.render(this.props.children, this.modalContainer)
    }
}
