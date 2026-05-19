VERSION 5.00
Begin VB.Form ErrorEventDlg 
   Caption         =   "An Error has Occured."
   ClientHeight    =   2085
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   5790
   LinkTopic       =   "ErrorEvent"
   ScaleHeight     =   2085
   ScaleWidth      =   5790
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton ErrorCancelButton 
      Caption         =   "Cancel Process"
      Height          =   375
      Left            =   3840
      TabIndex        =   3
      Top             =   1320
      Width           =   1575
   End
   Begin VB.CommandButton ErrorRetryButton 
      Caption         =   "Retry Process"
      Height          =   375
      Left            =   2040
      TabIndex        =   2
      Top             =   1320
      Width           =   1695
   End
   Begin VB.CommandButton ErrorSuspendButton 
      Caption         =   "Suspend Process"
      Height          =   375
      Left            =   240
      TabIndex        =   1
      Top             =   1320
      Width           =   1695
   End
   Begin VB.Label ErrorMessageLabel 
      Caption         =   "ErrorMessage"
      Height          =   975
      Left            =   240
      TabIndex        =   0
      Top             =   240
      Width           =   5175
   End
End
Attribute VB_Name = "ErrorEventDlg"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False

Private Sub ErrorCancelButton_Click()

    
    Form4.ErrorRecovery = 0
    
    Me.Hide
    

End Sub

Private Sub ErrorRetryButton_Click()

    Form4.ErrorRecovery = 1
    
    Me.Hide
    

End Sub

Private Sub ErrorSuspendButton_Click()

    Form4.ErrorRecovery = 2

    Me.Hide
    
End Sub

