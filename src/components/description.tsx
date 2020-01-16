import * as React from "react"
import {
	Classes,
	Button,
	InputGroup,
	ProgressBar,
	Dialog,
} from "@blueprintjs/core"

interface EditDescriptionProps {
	isOpen: boolean
	isPending: boolean
	description: string
	onChange: (description: string) => void
	onCancel: () => void
}

export default class EditDescription extends React.Component<
	EditDescriptionProps,
	{ value: string }
> {
	constructor(props: EditDescriptionProps) {
		super(props)
		this.state = { value: props.description }
	}
	handleChange = (
		event: React.FormEvent<HTMLElement> & React.ChangeEvent<HTMLElement>
	) => this.setState({ value: (event.target as HTMLInputElement).value })
	handleCommit = () => this.props.onChange(this.state.value)
	handleCancel = () => {
		this.setState({ value: this.props.description })
		this.props.onCancel()
	}
	render() {
		const { isOpen, isPending } = this.props
		return (
			<Dialog isOpen={isOpen}>
				<div className={Classes.DIALOG_HEADER}>
					<h4 className={Classes.HEADING}>Edit package description</h4>
				</div>
				<div className={Classes.DIALOG_BODY}>
					<InputGroup
						value={this.state.value}
						onChange={this.handleChange}
						placeholder="Add a description..."
					/>
				</div>
				<div
					className={Classes.DIALOG_FOOTER}
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "end",
					}}
				>
					{isPending && <ProgressBar />}
					<div className={Classes.DIALOG_FOOTER_ACTIONS}>
						<Button
							onClick={this.handleCancel}
							intent="none"
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={this.handleCommit}
							intent="primary"
							disabled={isPending}
						>
							Save
						</Button>
					</div>
				</div>
			</Dialog>
		)
	}
}
