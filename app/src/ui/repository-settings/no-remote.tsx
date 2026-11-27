import * as React from 'react'
import { LinkButton } from '../lib/link-button'
import { CallToAction } from '../lib/call-to-action'
import { Button } from '../lib/button'
import { TextBox } from '../lib/text-box'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

const HelpURL = 'https://help.github.com/articles/about-remote-repositories/'

interface INoRemoteProps {
  /** The function to call when the users chooses to publish. */
  readonly onPublish: () => void

  /** Called when the user adds a new remote. */
  readonly onAddRemote?: (name: string, url: string) => Promise<void>
}

interface INoRemoteState {
  readonly isAddingRemote: boolean
  readonly newRemoteName: string
  readonly newRemoteUrl: string
  readonly addRemoteError: string | null
  readonly isSubmitting: boolean
}

/** The component for when a repository has no remote. */
export class NoRemote extends React.Component<INoRemoteProps, INoRemoteState> {
  public constructor(props: INoRemoteProps) {
    super(props)
    this.state = {
      isAddingRemote: false,
      newRemoteName: 'origin',
      newRemoteUrl: '',
      addRemoteError: null,
      isSubmitting: false,
    }
  }

  private onToggleAddRemote = () => {
    this.setState(prevState => ({
      isAddingRemote: !prevState.isAddingRemote,
      newRemoteName: 'origin',
      newRemoteUrl: '',
      addRemoteError: null,
    }))
  }

  private onNameChanged = (name: string) => {
    this.setState({ newRemoteName: name, addRemoteError: null })
  }

  private onUrlChanged = (url: string) => {
    this.setState({ newRemoteUrl: url, addRemoteError: null })
  }

  private onAddRemoteSubmit = async () => {
    const name = this.state.newRemoteName.trim()
    const url = this.state.newRemoteUrl.trim()

    if (name.length === 0) {
      this.setState({ addRemoteError: 'Remote name cannot be empty.' })
      return
    }

    if (/\s/.test(name)) {
      this.setState({
        addRemoteError: 'Remote name cannot contain whitespace.',
      })
      return
    }

    if (url.length === 0) {
      this.setState({ addRemoteError: 'Remote URL cannot be empty.' })
      return
    }

    this.setState({ isSubmitting: true, addRemoteError: null })
    try {
      if (this.props.onAddRemote) {
        await this.props.onAddRemote(name, url)
      }
    } catch (e) {
      this.setState({
        isSubmitting: false,
        addRemoteError: `Failed to add remote: ${e}`,
      })
    }
  }

  public render() {
    if (this.state.isAddingRemote) {
      const canSubmit =
        this.state.newRemoteName.trim().length > 0 &&
        this.state.newRemoteUrl.trim().length > 0

      return (
        <div className="add-remote-section">
          <h3>
            {__DARWIN__ ? 'Add Remote Repository' : 'Add remote repository'}
          </h3>
          <TextBox
            label="Remote name"
            placeholder="e.g. origin"
            value={this.state.newRemoteName}
            onValueChanged={this.onNameChanged}
            disabled={this.state.isSubmitting}
            autoFocus={true}
          />
          <TextBox
            label="Remote URL"
            placeholder="https://github.com/owner/repository.git"
            value={this.state.newRemoteUrl}
            onValueChanged={this.onUrlChanged}
            disabled={this.state.isSubmitting}
          />
          {this.state.addRemoteError && (
            <div className="add-remote-error">{this.state.addRemoteError}</div>
          )}
          <div className="add-remote-actions">
            <Button
              type="button"
              onClick={this.onAddRemoteSubmit}
              disabled={this.state.isSubmitting || !canSubmit}
            >
              Add
            </Button>
            <Button
              type="button"
              onClick={this.onToggleAddRemote}
              disabled={this.state.isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="no-remote-container">
        <CallToAction actionTitle="Publish" onAction={this.props.onPublish}>
          <div className="no-remote-publish-message">
            Publish your repository to GitHub. Need help?{' '}
            <LinkButton uri={HelpURL}>
              Learn more about remote repositories.
            </LinkButton>
          </div>
        </CallToAction>
        {this.props.onAddRemote && (
          <div className="no-remote-add-container">
            <Button size="small" onClick={this.onToggleAddRemote}>
              <Octicon symbol={octicons.plus} />
              Add remote repository
            </Button>
          </div>
        )}
      </div>
    )
  }
}
