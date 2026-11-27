import * as React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogError } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { Select } from '../lib/select'
import { Row } from '../lib/row'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { Account, getFriendlyEndpoint } from '../../models/account'
import { API, IAPIOrganization } from '../../lib/api'
import { caseInsensitiveCompare } from '../../lib/compare'
import { Loading } from '../lib/loading'

interface IMirrorRepositoryDialogProps {
  readonly dispatcher: Dispatcher
  readonly repository: Repository
  readonly accounts: ReadonlyArray<Account>
  readonly activeAccount: Account | null
  readonly onDismissed: () => void
}

type DestinationMode = 'account' | 'url'

interface IMirrorRepositoryDialogState {
  readonly mode: DestinationMode
  readonly selectedAccount: Account | null
  readonly targetRepoName: string
  readonly customUrl: string
  readonly selectedOrg: string | null
  readonly orgs: ReadonlyArray<IAPIOrganization>
  readonly saveAsRemote: boolean
  readonly autoSync: boolean
  readonly isLoading: boolean
  readonly isFetchingOrgs: boolean
  readonly error: Error | null
}

export class MirrorRepositoryDialog extends React.Component<
  IMirrorRepositoryDialogProps,
  IMirrorRepositoryDialogState
> {
  public constructor(props: IMirrorRepositoryDialogProps) {
    super(props)

    const initialAccount =
      props.activeAccount ??
      (props.accounts.length > 0 ? props.accounts[0] : null)

    this.state = {
      mode: props.accounts.length > 0 ? 'account' : 'url',
      selectedAccount: initialAccount,
      targetRepoName: props.repository.name,
      customUrl: '',
      selectedOrg: null,
      orgs: [],
      saveAsRemote: true,
      autoSync: true,
      isLoading: false,
      isFetchingOrgs: false,
      error: null,
    }
  }

  public async componentDidMount() {
    if (this.state.selectedAccount !== null) {
      await this.fetchOrgs(this.state.selectedAccount)
    }
  }

  private fetchOrgs = async (account: Account) => {
    this.setState({ isFetchingOrgs: true })
    try {
      const api = API.fromAccount(account)
      const apiOrgs = await api.fetchOrgs()
      const orgs = [...apiOrgs]
      orgs.sort((a, b) => caseInsensitiveCompare(a.login, b.login))
      this.setState({ orgs, isFetchingOrgs: false })
    } catch {
      this.setState({ orgs: [], isFetchingOrgs: false })
    }
  }

  private onModeChanged = (event: React.FormEvent<HTMLSelectElement>) => {
    const mode = event.currentTarget.value as DestinationMode
    this.setState({ mode, error: null })
  }

  private onAccountChanged = async (
    event: React.FormEvent<HTMLSelectElement>
  ) => {
    const login = event.currentTarget.value
    const account =
      this.props.accounts.find(a => a.login === login) ?? null

    this.setState({ selectedAccount: account, selectedOrg: null, orgs: [] })
    if (account !== null) {
      await this.fetchOrgs(account)
    }
  }

  private onOrgChanged = (event: React.FormEvent<HTMLSelectElement>) => {
    const val = event.currentTarget.value
    this.setState({ selectedOrg: val.length > 0 ? val : null })
  }

  private onTargetRepoNameChanged = (targetRepoName: string) => {
    this.setState({ targetRepoName, error: null })
  }

  private onCustomUrlChanged = (customUrl: string) => {
    this.setState({ customUrl, error: null })
  }

  private onSaveAsRemoteChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.setState({ saveAsRemote: event.currentTarget.checked })
  }

  private onAutoSyncChanged = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({ autoSync: event.currentTarget.checked })
  }

  private getEffectiveDestinationUrl(): string {
    if (this.state.mode === 'url') {
      return this.state.customUrl
    }

    const { selectedAccount, selectedOrg, targetRepoName } = this.state
    if (selectedAccount === null || targetRepoName.length === 0) {
      return ''
    }

    const owner = selectedOrg !== null ? selectedOrg : selectedAccount.login
    const endpoint = selectedAccount.endpoint
    const cleanRepoName = targetRepoName.endsWith('.git')
      ? targetRepoName
      : `${targetRepoName}.git`

    if (endpoint.includes('github.com')) {
      return `https://github.com/${owner}/${cleanRepoName}`
    }

    // Enterprise endpoint handling
    const baseUrl = endpoint.replace(/\/api\/v3\/?$/, '')
    return `${baseUrl}/${owner}/${cleanRepoName}`
  }

  private onSubmit = async () => {
    const destinationUrl = this.getEffectiveDestinationUrl()
    if (destinationUrl.length === 0) {
      this.setState({
        error: new Error('Please specify a valid destination repository.'),
      })
      return
    }

    this.setState({ isLoading: true, error: null })

    try {
      await this.props.dispatcher.mirrorRepository(
        this.props.repository,
        destinationUrl,
        this.state.selectedAccount,
        this.state.saveAsRemote,
        // eslint-disable-next-line no-sync
        this.state.autoSync
      )
      this.props.onDismissed()
    } catch (e) {
      this.setState({
        isLoading: false,
        error: e instanceof Error ? e : new Error(String(e)),
      })
    }
  }

  public render() {
    const { accounts, repository } = this.props
    const {
      mode,
      selectedAccount,
      selectedOrg,
      orgs,
      targetRepoName,
      customUrl,
      saveAsRemote,
      autoSync,
      isLoading,
      isFetchingOrgs,
      error,
    } = this.state

    const hasAccounts = accounts.length > 0
    const destinationUrl = this.getEffectiveDestinationUrl()
    const canSubmit = !isLoading && destinationUrl.length > 0

    return (
      <Dialog
        id="mirror-repository-dialog"
        title="Mirror repository"
        onSubmit={this.onSubmit}
        onDismissed={this.props.onDismissed}
        loading={isLoading}
        disabled={isLoading}
      >
        <DialogContent>
          {error !== null && <DialogError>{error.message}</DialogError>}

          <p className="mirror-intro">
            Mirror all branches, tags, and commits of{' '}
            <strong>{repository.name}</strong> to a target destination using{' '}
            <code>git push --mirror</code>.
          </p>

          {hasAccounts && (
            <Row>
              <Select
                label="Destination type"
                value={mode}
                onChange={this.onModeChanged}
              >
                <option value="account">Signed-in GitHub account</option>
                <option value="url">Custom Git Remote URL</option>
              </Select>
            </Row>
          )}

          {mode === 'account' && hasAccounts && (
            <>
              <Row>
                <Select
                  label="Target account"
                  value={selectedAccount?.login ?? ''}
                  onChange={this.onAccountChanged}
                >
                  {accounts.map(acc => (
                    <option key={`${acc.endpoint}/${acc.login}`} value={acc.login}>
                      @{acc.login} ({getFriendlyEndpoint(acc.endpoint)})
                    </option>
                  ))}
                </Select>
              </Row>

              {orgs.length > 0 && (
                <Row>
                  <Select
                    label="Owner / Organization"
                    value={selectedOrg ?? ''}
                    onChange={this.onOrgChanged}
                    disabled={isFetchingOrgs}
                  >
                    <option value="">
                      Personal account (@{selectedAccount?.login})
                    </option>
                    {orgs.map(org => (
                      <option key={org.login} value={org.login}>
                        {org.login}
                      </option>
                    ))}
                  </Select>
                </Row>
              )}

              <Row>
                <TextBox
                  label="Target repository name"
                  value={targetRepoName}
                  onValueChanged={this.onTargetRepoNameChanged}
                  placeholder="repository-name"
                />
              </Row>
            </>
          )}

          {(mode === 'url' || !hasAccounts) && (
            <Row>
              <TextBox
                label="Destination Git URL"
                value={customUrl}
                onValueChanged={this.onCustomUrlChanged}
                placeholder="https://github.com/owner/target-repo.git"
                autoFocus={true}
              />
            </Row>
          )}

          {destinationUrl.length > 0 && (
            <div className="mirror-target-preview">
              <span className="preview-label">Mirror URL: </span>
              <code className="preview-url">{destinationUrl}</code>
            </div>
          )}

          <div className="mirror-options-section">
            <Row>
              <Checkbox
                label="Save as 'mirror' remote in this repository"
                value={saveAsRemote ? CheckboxValue.On : CheckboxValue.Off}
                onChange={this.onSaveAsRemoteChanged}
              />
            </Row>

            {saveAsRemote && (
              <Row>
                <Checkbox
                  label="Automatically push mirror when pushing repository"
                  value={autoSync ? CheckboxValue.On : CheckboxValue.Off}
                  onChange={this.onAutoSyncChanged}
                />
              </Row>
            )}
          </div>

          {isLoading && (
            <div className="mirror-loading">
              <Loading />
              <span>Mirroring repository, please wait…</span>
            </div>
          )}
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText="Mirror repository"
            okButtonDisabled={!canSubmit}
            cancelButtonDisabled={isLoading}
          />
        </DialogFooter>
      </Dialog>
    )
  }
}
