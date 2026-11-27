import * as React from 'react'
import { TextBox } from '../lib/text-box'
import { Button } from '../lib/button'
import { Row } from '../lib/row'
import { DialogContent } from '../dialog'
import { Ref } from '../lib/ref'
import { Checkbox, CheckboxValue } from '../lib/checkbox'

interface ICloneGenericRepositoryProps {
  /** The URL to clone. */
  readonly url: string

  /** The path to which the repository should be cloned. */
  readonly path: string

  /** Called when the destination path changes. */
  readonly onPathChanged: (path: string) => void

  /** Called when the URL to clone changes. */
  readonly onUrlChanged: (url: string) => void

  /**
   * Called when the user should be prompted to choose a directory to clone to.
   */
  readonly onChooseDirectory: () => Promise<string | undefined>

  /** Whether to clone as a mirror repository (--mirror). */
  readonly mirror?: boolean

  /** Called when the mirror checkbox changes. */
  readonly onMirrorChanged?: (mirror: boolean) => void
}

/** The component for cloning a repository. */
export class CloneGenericRepository extends React.Component<
  ICloneGenericRepositoryProps,
  {}
> {
  public render() {
    return (
      <DialogContent className="clone-generic-repository-content">
        <Row>
          <TextBox
            placeholder="URL or username/repository"
            value={this.props.url}
            onValueChanged={this.onUrlChanged}
            autoFocus={true}
            label={
              <div className="clone-url-textbox-label">
                <p>Repository URL or GitHub username and repository</p>
                <p>
                  (<Ref>hubot/cool-repo</Ref>)
                </p>
              </div>
            }
          />
        </Row>

        <Row>
          <TextBox
            value={this.props.path}
            label={__DARWIN__ ? 'Local Path' : 'Local path'}
            placeholder="repository path"
            onValueChanged={this.props.onPathChanged}
          />
          <Button onClick={this.props.onChooseDirectory}>Choose…</Button>
        </Row>

        {this.props.onMirrorChanged !== undefined && (
          <Row>
            <Checkbox
              label="Clone as mirror repository (--mirror)"
              value={
                this.props.mirror === true
                  ? CheckboxValue.On
                  : CheckboxValue.Off
              }
              onChange={this.onMirrorCheckboxChanged}
            />
          </Row>
        )}
      </DialogContent>
    )
  }

  private onMirrorCheckboxChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.props.onMirrorChanged?.(event.currentTarget.checked)
  }

  private onUrlChanged = (url: string) => {
    this.props.onUrlChanged(url)
  }
}
